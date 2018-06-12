var mongoose = require('mongoose'), Schema = mongoose.Schema;
var moment = require('moment');

var AuthorSchema = new Schema(
    {
        first_name: {type: String, required: true, max: 100},
        family_name: {type: String, required: true, max: 100},
        date_of_birth: {type: Date},
        date_of_death: {type: Date}
    }
);

// virtual for the author's full name
AuthorSchema.virtual('name').get(function() {
    return this.family_name + ', ' + this.first_name;
});

// virtual for the author's URL that returns the absolute URL required to get a particular instance of the model — we'll use the property in our templates whenever we need to get a link to a particular author. Declaring our URLs as a virtual in the schema is a good idea because then the URL for an item only ever needs to be changed in one place.
AuthorSchema.virtual('url').get(function() {
    return '/catalog/author/' + this._id;
});

AuthorSchema.virtual('date_of_birth_formatted').get(function() {
    return this.date_of_birth ? moment(this.date_of_birth).format('YYYY-MM-DD') : '';
});

AuthorSchema.virtual('date_of_death_formatted').get(function() {
    return this.date_of_death ? moment(this.date_of_death).format("YYYY-MM-DD") : '';
});

module.exports = mongoose.model("Author", AuthorSchema);