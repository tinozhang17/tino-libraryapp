var Genre = require('../models/genre');
var Book = require('../models/book');
var async = require('async');
var mongoose = require('mongoose');

const {body, validationResult} = require('express-validator/check');
const {sanitizeBody} = require('express-validator/filter');

// Display list of all Genre.
exports.genre_list = function(req, res, next) {
    Genre.find()
        .sort([['name', 'ascending']])
        .exec(function(err, list_genres) {
            if (err) {
                return next(err);
            }
            res.render('genre_list', {title: 'Genre List', genre_list: list_genres});
        });
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {
    var id = mongoose.Types.ObjectId(req.params.id);

    async.parallel({
        genre: function(callback) {
            Genre.findById(id)
                .exec(callback);
        },

        genre_books: function(callback) {
            Book.find({'genre': req.params.id})
                .exec(callback);
        }
    }, function(err, results) {
        if (err) { return next(err);}
        if (!results.genre) {
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render
        res.render('genre_detail', {title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books});
    });
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res, next) {
    res.render('genre_form', {title: 'Create Genre'});
};

// Handle Genre create on POST.

// Instead of being a single middleware function (with arguments (req, res, next)) the controller specifies an array of middleware functions. The array is passed to the router function and each method is called in order.
exports.genre_create_post = [

    //The first method in the array defines a validator (body) to check that the name field is not empty (calling trim() to remove any trailing/leading whitespace before performing the validation). The  second method in the array (sanitizeBody()) creates a sanitizer to trim() the name field and escape() any dangerous  HTML characters. Sanitizers run during validation do not modify the request. That is why we have to call trim() in both steps below

    body('name', 'Genre name required').isLength({min: 1}).trim(),

    sanitizeBody('name').trim().escape(),

    (req, res, next) => {
        const errors = validationResult(req);

        let genre = new Genre(
            {name: req.body.name}
        );

        if (!errors.isEmpty()) {
            res.render('genre_form', {title: 'Create Genre', genre: genre, errors: errors.array()});
            return;
        } else {
            Genre.findOne({'name': req.body.name})
                .exec(function (err, found_genre) {
                    if (err) {
                        return next(err);
                    }

                    if (found_genre) {
                        res.redirect(found_genre.url);
                    } else {
                        genre.save(function(err, saved_genre) {
                            if (err) {
                                return next(err);
                            } else {
                                res.redirect(genre.url);
                            }
                        });
                    }
                });
        }
    }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {
    let id = mongoose.Types.ObjectId(req.params.id);

    async.parallel({
        genre: function(callback) {
            Genre.findById(id).exec(callback);
        },

        genre_books: function(callback) {
            Book.find({'genre': id}).exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        } else {
            if (!results.genre) {
                let err = new Error("Genre not found!");
                err.status = 404;
                return next(err);
            } else {
                res.render('genre_detail', {title: "Delete Genre", genre: results.genre, genre_books: results.genre_books, delete_flag: true});
            }
        }
    });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {
    let id = mongoose.Types.ObjectId(req.body.genre);

    async.parallel({
        genre: function(callback) {
            Genre.findById(id).exec(callback);
        },

        genre_books: function(callback) {
            Book.find({'genre': id}).exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        } else if (!results.genre) {
            let err = new Error("Genre not found!");
            err.status = 404;
            return next(err);
        } else if (results.genre_books.length > 0) {
            res.render('genre_detail', {title: "Delete Genre", genre: results.genre, genre_books: results.genre_books, delete_flag: true});
        } else {
            Genre.findByIdAndRemove(id)
                .exec(function(err) {
                    if (err) {
                        return next(err);
                    } else {
                        res.redirect('/catalog/genres');
                    }
                });
        }
    });
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {
    let id = mongoose.Types.ObjectId(req.params.id);

    Genre.findById(id)
        .exec(function(err, result) {
            if (err) {
                return next(err);
            } else if (!result) {
                let err = new Error("Genre not found!");
                err.status = 404;
                return next(err);
            } else {
                res.render('genre_form', {title: "Update Genre", genre: result, update_flag: true});
            }
        })
};

// Handle Genre update on POST.
exports.genre_update_post = [
    body('name', 'Genre name cannot be blank.').isLength({min: 2}),
    sanitizeBody('name').trim().escape(),
    function(req, res, next) {
        const errors = validationResult(req);

        let id = mongoose.Types.ObjectId(req.body.genre_id);

        let genre = new Genre({
            name: req.body.name,
            _id: id
        });

        if (!errors.isEmpty()) {
            console.log(errors);
            res.render('genre_form', {title: "Update Genre", genre: genre, errors: errors.array(), update_flag: true})
        } else {
            Genre.findById(id)
                .exec(function(err, result) {
                    if (err) {
                        return next(err);
                    } else if (!result) {
                        let err = new Error("Genre not found!");
                        err.status = 404;
                        return next(err);
                    } else {
                        Genre.findByIdAndUpdate(id, genre, {}, function(err, updated_genre) {
                            if (err) {
                                return next(err);
                            } else {
                                res.redirect(updated_genre.url);
                            }
                        });
                    }
                });
        }
    }
];