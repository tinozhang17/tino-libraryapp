var BookInstance = require('../models/bookinstance');
var Book = require('../models/book');

var async = require('async');
var mongoose = require('mongoose');
var moment = require('moment');

const {body, validationResult} = require('express-validator/check');
const {sanitizeBody} = require('express-validator/filter');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {
    BookInstance.find()
        .populate('book')
        .exec(function(err, list_bookinstances) {
            if (err) {
                return next(err);
            }
            res.render('bookinstance_list', {title: "Book Instance List", bookinstance_list: list_bookinstances});
        });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {
    var id = mongoose.Types.ObjectId(req.params.id);

    BookInstance.findById(id)
        .populate("book")
        .exec(function(err, result) {
            if (err) {
                return next(err);
            }
            if (!result) {
                var err = new Error("Book instance not found");
                err.status = 404;
                return next(err);
            }
            res.render("bookinstance_detail", {title: "ID", bookinstance: result});
        });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {
    async.parallel({
        books: function(callback) {
            Book.find(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        } else {
            res.render('bookinstance_form', {title: 'Create Book Instance', books: results.books});
        }
    });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
    body('book', 'Book must not be empty').isLength({min: 1}).trim(),
    body('imprint', 'Imprint must not be empty').isLength({min: 1}).trim(),
    body('due_back').optional({checkFalsy: true}).isISO8601().withMessage('Invalid Date').customSanitizer(value => {
        return value ? value.slice(5,7) + '-' + value.slice(8) + '-' + value.slice(0,4) : value;
    }).toDate(),
    body('status').isLength({min: 1}).trim(),
    sanitizeBody('*').trim().escape(),

    function(req, res, next) {
        const errors = validationResult(req);

        let bookinstance = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            due_back: req.body.due_back,
            status: req.body.status
        });

        if (!errors.isEmpty()) {
            async.parallel({
                books: function(callback) {
                    Book.find(callback);
                }
            }, function(err, results) {
                if (err) {
                    return next(err);
                } else {
                    res.render('bookinstance_form', {title: 'Create Book Instance', books: results.books, bookinstance: bookinstance, errors: errors.array()});
                    return;
                }
            });
        } else {
            bookinstance.save(function(err, saved_bookinstance) {
                if (err) {
                    return next(err);
                } else {
                    res.redirect(saved_bookinstance.url);
                }
            });
        }
    }
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
    let id = mongoose.Types.ObjectId(req.params.id);

    BookInstance.findById(id)
        .populate('book')
        .exec(function(err, result) {
            if (err) {
                return next(err);
            } else if (!result) {
                let err = new Error('Book Instance Not Found!');
                err.status = 404;
                return next(err);
            } else {
                res.render('bookinstance_detail', {title: "Delete Book Instance", bookinstance: result, delete_flag: true});
            }
        })
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {
    let id = mongoose.Types.ObjectId(req.params.id);

    BookInstance.findByIdAndRemove(id)
        .exec(err => {
            if (err) {
                return next(err);
            } else {
                res.redirect('/catalog/bookinstances');
            }
        })
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res, next) {
    let id = mongoose.Types.ObjectId(req.params.id);

    async.parallel({
        books: function(callback) {
            Book.find(callback);
        },

        book_instance: function(callback) {
            BookInstance.findById(id).exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        } else if (!results.book_instance) {
            let err = new Error('Book Instance Not Found!');
            err.status = 404;
            return next(err);
        } else {
            console.log(results.book_instance.due_back_formatted_for_update);
            res.render('bookinstance_form', {title: "Update Book Instance", books: results.books, bookinstance: results.book_instance, update_flag: true});
        }
    });
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
    body('book', 'Book must not be empty').isLength({min: 1}).trim(),
    body('imprint', 'Imprint must not be empty').isLength({min: 1}).trim(),
    body('due_back').optional({checkFalsy: true}).isISO8601().withMessage('Invalid Date').customSanitizer(value => {
        return value ? value.slice(5,7) + '-' + value.slice(8) + '-' + value.slice(0,4) : value;
    }).toDate(),
    body('status').isLength({min: 1}).trim(),
    sanitizeBody('*').trim().escape(),

    function(req, res, next) {
        const errors = validationResult(req);

        let bookinstance = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            due_back: req.body.due_back,
            status: req.body.status,
            _id: req.params.id,
        });

        if (!errors.isEmpty()) {
            async.parallel({
                books: function(callback) {
                    Book.find(callback);
                }
            }, function(err, results) {
                if (err) {
                    return next(err);
                } else {
                    res.render('bookinstance_form', {title: 'Create Book Instance', books: results.books, bookinstance: bookinstance, errors: errors.array()});
                    return;
                }
            });
        } else {
            BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function (err, updated_bookinstance) {
                if (err) {
                    return next(err);
                } else {
                    res.redirect(updated_bookinstance.url);
                }
            });
        }
    }
];