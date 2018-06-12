var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');

var async = require('async');
var mongoose = require('mongoose');

const {body, validationResult} = require('express-validator/check');
const {sanitizeBody} = require('express-validator/filter');

exports.index = function(req, res) {
    async.parallel(
        {
            book_count: function(callback) {
                Book.count({}, callback);
            },
            book_instance_count: function(callback) {
                BookInstance.count({}, callback);
            },
            book_instance_available_count: function(callback) {
                BookInstance.count({status: 'Available'}, callback);
            },
            author_count: function(callback) {
                Author.count({}, callback);
            },
            genre_count: function(callback) {
                Genre.count({}, callback);
            }
        }, function(err, results) {
            res.render('index', {title: 'Local Library Home', error: err, data: results});
        }
    );
};

// Display list of all books.
exports.book_list = function(req, res, next) {
    Book.find({}, "title author")
        .populate('author')
        .exec(function (err, list_books) {
            if (err) {
                return next(err);
            }
            res.render('book_list', {title: 'Book List', book_list: list_books});
        });
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
    var id = mongoose.Types.ObjectId(req.params.id);

    async.parallel({
        book: function(callback) {
            Book.findById(id)
                .populate('author')
                .populate('genre')
                .exec(callback)
        },
        book_instance: function(callback) {
            BookInstance.find({book: id})
                .exec(callback)
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (!results.book) {
            var err = new Error("Book not found");
            err.status = 404;
            return next(err);
        }
        res.render("book_detail", {title: "Title", book: results.book, book_instances: results.book_instance});
    });
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
    async.parallel({
        authors: function(callback) {
            Author.find(callback);
        },
        genres: function(callback) {
            Genre.find(callback)
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        } else {
            res.render('book_form', {title: 'Create Book', authors: results.authors, genres: results.genres})
        }
    });
};

// Handle book create on POST.
exports.book_create_post = [
    // turn genre input into array
    (req, res, next) => {
        if (!req.body.genre instanceof Array) {
            if (typeof req.body.genre==='undefined') {
                req.body.genre=[];
            } else {
                req.body.genre = new Array(req.body.genre);
            }
        }
        next();
    },

    // validation and sanitization
    body('title', 'Title cannot be empty').isLength({min: 1}).trim(),
    body('summary', 'Summary cannot be empty').isLength({min: 1}).trim(),
    body('author', 'Author cannot be empty').isLength({min: 1}).trim(),
    body('isbn', 'ISBN cannot be empty').isLength({min: 1}).trim(),
    // here we use a wildcard to trim and escape all the input parameters
    sanitizeBody('*').trim().escape(),

    (req, res, next) => {
        const errors = validationResult(req);

        let book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre
        });

        if (!errors.isEmpty()) {
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback)
                }
            }, function(err, results) {
                if (err) {
                    return next(err);
                } else {
                    for (let i = 0; i < results.genres.length; i++) {
                        if (book.genre.indexOf(results.genres[i]._id) !== -1) {
                            results.genres[i].checked = 'true';
                        }
                    }
                    res.render('book_form', {title: 'Create Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array()});
                }
            });
            return;
        } else {
            book.save(function(err, saved_book) {
                if (err) {
                    return next(err);
                } else {
                    res.redirect(saved_book.url);
                }
            });
        }
    }
];

// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .exec(callback);
        },

        book_instances: function(callback) {
            BookInstance.find({book: req.params.id})
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        } else {
            if (results.book === null) {
                res.redirect('/catalog/book');
            } else {
                res.render('book_detail', {title: 'Delete Book', book: results.book, book_instances: results.book_instances, delete_flag: true});
            }
        }
    });
};

// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .exec(callback);
        },

        book_instances: function(callback) {
            BookInstance.find({book: req.params.id})
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        } else {
            if (results.book_instances.length > 0) {
                res.render('book_detail', {title: 'Delete Book', book: results.book, book_instances: results.book_instances, delete_flag: true});
            } else {
                Book.findByIdAndRemove(results.book._id)
                    .exec(function(err) {
                        if (err) {
                            return next(err);
                        } else {
                            res.redirect('/catalog/books');
                        }
                    });
            }
        }
    });
};

// Display book update form on GET.
exports.book_update_get = function(req, res, next) {
    var id = mongoose.Types.ObjectId(req.params.id);

    async.parallel({
        book: function (callback) {
            Book.findById(id)
                .exec(callback);
        },

        authors: function (callback) {
            Author.find(callback);
        },

        genres: function (callback) {
            Genre.find(callback);
        }
    }, function (err, results) {
        if (err) {
            return next(err);
        } else {
            if (results.book && results.book.genre && results.genres) {
                for (let i = 0; i < results.genres.length; i++) {
                    if (results.book.genre.indexOf(results.genres[i]._id) !== -1) {
                        results.genres[i].checked = true;
                    }
                }
            }
            res.render('book_form', {title: 'Update Book', book: results.book, authors: results.authors, genres: results.genres, update_flag: true});
        }
    });
};

// Handle book update on POST.
exports.book_update_post = [
    // turn genre input into array
    (req, res, next) => {
        console.log(req.body);
        if (!req.body.genre instanceof Array) {
            if (typeof req.body.genre==='undefined') {
                req.body.genre=[];
            } else {
                req.body.genre = new Array(req.body.genre);
            }
        }
        next();
    },

    // validation and sanitization
    body('title', 'Title cannot be empty').isLength({min: 1}).trim(),
    body('summary', 'Summary cannot be empty').isLength({min: 1}).trim(),
    body('author', 'Author cannot be empty').isLength({min: 1}).trim(),
    body('isbn', 'ISBN cannot be empty').isLength({min: 1}).trim(),
    // here we use a wildcard to trim and escape all the input parameters
    sanitizeBody('*').trim().escape(),

    function(req, res, next) {
        let id = mongoose.Types.ObjectId(req.params.id);

        const errors = validationResult(req);

        let book = new Book({
            title: req.body.title,
            summary: req.body.summary,
            author: req.body.author,
            isbn: req.body.isbn,
            genre: req.body.genre,
            _id: req.params.id
        });

        if (!errors.isEmpty()) {
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback)
                }
            }, function(err, results) {
                if (err) {
                    return next(err);
                } else {
                    for (let i = 0; i < results.genres.length; i++) {
                        if (book.genre.indexOf(results.genres[i]._id) !== -1) {
                            results.genres[i].checked = 'true';
                        }
                    }
                    res.render('book_form', {title: 'Create Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array(), update_flag: true});
                }
            });
        } else {
            Book.findByIdAndUpdate(req.params.id, book, {}, function (err, updated_book) {
                if (err) {
                    return next(err);
                } else {
                    res.redirect(updated_book.url);
                }
            });
        }
    }
];