var Author = require('../models/author');
var Book = require('../models/book');

var async = require('async');
var mongoose = require('mongoose');

const {body, validationResult} = require('express-validator/check');
const {sanitizeBody} = require('express-validator/filter');

var moment = require('moment');

var debug = require('debug')('author');

// Display list of all Authors.
exports.author_list = function(req, res, next) {
    Author.find()
        .sort([['family_name', 'ascending']])
        .exec(function (err, list_authors) {
            if(err) {
                return next(err);
            }
            res.render('author_list', {title: 'Author List', author_list: list_authors});
        });
};

// Display detail page for a specific Author.
exports.author_detail = function(req, res, next) {
    var id = mongoose.Types.ObjectId(req.params.id);

    async.parallel({
        author: function(callback) {
            Author.findById(id)
                .exec(callback);
        },

        book_list: function(callback) {
            Book.find({author: id}, "title summary")
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (!results.author) {
            var err = new Error("Author not found");
            err.status = 404;
            return next(err);
        }
        res.render("author_detail", {title: "Author", author: results.author, book_list: results.book_list});
    });
};

// Display Author create form on GET.
exports.author_create_get = function(req, res, next) {
    res.render('author_form', {title: 'Create Author'});
};

// Handle Author create on POST.
exports.author_create_post = [
    body('first_name').isLength({min: 1}).trim().withMessage('First name cannot be blank.')
        .custom((value) => {
            return !/[^a-zA-Z'\s-]+/g.test(value);
        }).withMessage('First name contains invalid character(s)').trim().escape(),
    body('family_name').isLength({min: 1}).trim().withMessage('Last name cannot be blank.')
        .custom((value) => {
            return !/[^a-zA-Z'\s]+/g.test(value);
        }).withMessage('Last name contains invalid character(s)').trim().escape(),
    body('date_of_birth').optional({checkFalsy: true}).isISO8601().customSanitizer(value => {
        return value ? value.slice(5,7) + '-' + value.slice(8) + '-' + value.slice(0,4) : value;
    }).toDate(),
    body('date_of_death').optional({checkFalsy: true}).isISO8601().customSanitizer(value => {
        return value ? value.slice(5,7) + '-' + value.slice(8) + '-' + value.slice(0,4) : value;
    }).toDate(), //the checkFalsy flag means that we'll accept either an empty string or null as an empty value

    (req, res, next) => {
        const errors = validationResult(req);

        console.log(req.body.date_of_birth);

        let author = new Author({
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death
        });

        if(!errors.isEmpty()) {
            res.render('author_form', {title: 'Create Author', author: author, errors: errors.array()});
            return;
        } else {
            author.save(function(err, saved_author) {
                if (err) {
                    return next(err);
                } else {
                    res.redirect(saved_author.url);
                }
            });
        }
    }
];

// Display Author delete form on GET.
exports.author_delete_get = function(req, res, next) {
    async.parallel({
        author: function (callback) {
            Author.findById(req.params.id)
                .exec(callback);
        },

        books: function (callback) {
            Book.find({'author': req.params.id})
                .exec(callback);
        }
    }, function (err, results) {
        if (err) {
            return next(err);
        } else {
            if (results.author === null) {
                res.redirect('/catalog/authors');
            } else {
                res.render('author_delete', {title: 'Delete Author', author: results.author, book_list: results.books});
            }
        }
    });
};

// Handle Author delete on POST.
exports.author_delete_post = function(req, res, next) {

    async.parallel({
        author: function (callback) {
            Author.findById(req.body.authorid).exec(callback);
        },

        author_books: function (callback) {
            Book.find({author: req.body.authorid}).exec(callback);
        }
    }, function (err, results) {
        if (err) {
            return next(err);
        } else {
            if (results.author_books.length > 0) {
                res.render('author_delete', {title: 'Delete Author', author: results.author, book_list: results.author_books});
            } else {
                Author.findByIdAndRemove(req.body.authorid)
                    .exec(function(err) {
                        if (err) {
                            return next(err);
                        } else {
                            res.redirect('/catalog/authors');
                        }
                    });
            }
        }
    });
};

// Display Author update form on GET.
exports.author_update_get = function(req, res, next) {
    let id = mongoose.Types.ObjectId(req.params.id);

    Author.findById(id)
        .exec((err, result) => {
            if (err) {
                return next(err);
            } else {
                if (!result) {
                    let err = new Error('Author not found!');
                    err.status = 404;
                    debug('update err: ' + err);
                    return next(err);
                } else {
                    res.render('author_form', {title: 'Update Author', author: result, update_flag: true});
                }
            }
        });
};

// Handle Author update on POST.
exports.author_update_post = [
    body('first_name').isLength({min: 1}).trim().withMessage('First name cannot be blank.')
        .custom((value) => {
            return !/[^a-zA-Z'\s-]+/g.test(value);
        }).withMessage('First name contains invalid character(s)').trim().escape(),
    body('family_name').isLength({min: 1}).trim().withMessage('Last name cannot be blank.')
        .custom((value) => {
            return !/[^a-zA-Z'\s]+/g.test(value);
        }).withMessage('Last name contains invalid character(s)').trim().escape(),
    body('date_of_birth').optional({checkFalsy: true}).isISO8601().customSanitizer(value => {
        return value ? value.slice(5,7) + '-' + value.slice(8) + '-' + value.slice(0,4) : value;
    }).toDate(),
    body('date_of_death').optional({checkFalsy: true}).isISO8601().customSanitizer(value => {
        return value ? value.slice(5,7) + '-' + value.slice(8) + '-' + value.slice(0,4) : value;
    }).toDate(), //the checkFalsy flag means that we'll accept either an empty string or null as an empty value

    (req, res, next) => {
        let id = mongoose.Types.ObjectId(req.body.author_id);
        const errors = validationResult(req);

        let author = new Author({
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death,
            _id: id
        });

        if (!errors.isEmpty()) {
            res.render('author_form', {title: 'Update', author: author, errors: errors.array(), update_flag: true});
        } else {
            Author.findByIdAndUpdate(id, author, {}, function(err, updated_author) {
                if (err) {
                    return next(err);
                } else {
                    res.redirect(updated_author.url);
                }
            });
        }
    }
];

