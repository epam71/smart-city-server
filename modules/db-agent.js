'use strict';
const DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-city';
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const mongoose = require('mongoose');
const restify = require('express-restify-mongoose');

const validator = require('./validator');
const dbSchemes = require('./db-schemes');

const PROJECT_COLL_NAME = 'projects';
const NEWS_COLL_NAME = 'news';
const MESSAGE_COLL_NAME = 'messages';

function promiseWrapper(func) {
    return (req, res, next) => {
        new Promise((resolve,reject) => resolve(func(req,res,next)))
            .catch(err => next(err));
    };
}

function restifyProjects(router) {
    const projectsURI = restify.serve(
        router,
        mongoose.model(
            PROJECT_COLL_NAME,
            dbSchemes.projects
            ));

    console.log(`project URI : ${projectsURI}`);
}

function restifyNews(router) {
    const newsURI = restify.serve(
        router,
        mongoose.model(
            NEWS_COLL_NAME,
            dbSchemes.news
            ));

    console.log(`news URI : ${newsURI}`);
}

function restifyMessages(router) {
    const messagesURI = restify.serve(
        router,
        mongoose.model(
            MESSAGE_COLL_NAME,
            dbSchemes.messages
            ));

    console.log(`messages URI : ${messagesURI}`);
}

function restifyDB(router, onError) {
    restify.defaults({
        prefix: '',
        version: '',
        onError: onError
    });

    mongoose.Promise = global.Promise;
    mongoose.connection.openUri(DB_URL);
    mongoose.connection.on('error', () =>
        console.log(`Mongoose connection failed URL : ${DB_URL}`
        ));
    mongoose.connection.on('open', () => {
        console.log(`Mongoose connection succeful URL : ${DB_URL}`);        
        restifyProjects(router);
        restifyNews(router);
        restifyMessages(router);
    });
}

function connectDB() {
    return new Promise((resolve, reject) => {
        MongoClient.connect(DB_URL, (err, db) => {
            if (err) {
                reject(err)
            }
            resolve(db);
        })
    });
}

async function postProjectLike(req, res, next) {
    let isIdFilled = validator.isIdFilled(req);
    let isEmailFilled = validator.isEmailFilled(req);
    let projectId = req.params.id;
    let email = req.body.email;
    let project;
    let isPosted;
    let db;

    if (isIdFilled.error || isEmailFilled.error) {
        next(isIdFilled.error || isEmailFilled.error);
        return;
    }

    db = await connectDB();
    project = await (() => 
            new Promise((resolve, reject) => {
                db.collection(PROJECT_COLL_NAME).findOne({_id: ObjectId(projectId)},
                    (err, result) => {
                    if (err || result === null) {
                        res.status(400);
                        reject(err || new Error(`Project id ${projectId} doesn\'t exist`));
                    }
                    resolve(result);
                });
            })
        )();
    project.likes = project.likes || [];
    project.rating = typeof project.rating !== 'number' || isNaN(project.rating) ? 0 :project.rating;
    if (project.likes.indexOf(email) >= 0) {
        res.status(400);
        next(new Error(`User ${email} can't post like twice`));
        return;
    }

    project.rating += 1;
    project.likes.push(email);

    isPosted = await (() => 
            new Promise((resolve, reject) => {
                db.collection(PROJECT_COLL_NAME).updateOne( {_id: ObjectId(projectId)}, 
                    { $set: {
                            rating: project.rating,
                            likes: project.likes
                        }
                    },
                    (err, result) => {
                        if (err) {
                            res.status(400);
                            reject(err);
                        }
                        resolve(result);
                });
            })
        )();
    db.close();
    res.json({
        message: `Project ${projectId} user ${email} like posted`,
        currentRating: project.rating
    });    
}

async function postNewsLike(req, res, next) {
    let isIdFilled = validator.isIdFilled(req);
    let isEmailFilled = validator.isEmailFilled(req);
    let newsId = req.params.id;
    let email = req.body.email;
    let news;
    let isPosted;
    let db;

    if (isIdFilled.error || isEmailFilled.error) {
        next(isIdFilled.error || isEmailFilled.error);
        return;
    }

    db = await connectDB();
    news = await (() => 
            new Promise((resolve, reject) => {
                db.collection(NEWS_COLL_NAME).findOne({_id: ObjectId(newsId)},
                    (err, result) => {
                    if (err || result === null) {
                        res.status(400);
                        reject(err || new Error(`News id ${newsId} doesn\'t exist`));
                    }
                    resolve(result);
                });
            })
        )();
    news.likes = news.likes || [];
    news.rating = typeof news.rating !== 'number' || isNaN(news.rating) ? 0 :news.rating;
    if (news.likes.indexOf(email) >= 0) {
        res.status(400);
        next(new Error(`User ${email} can't post like twice`));
        return;
    }

    news.rating += 1;
    news.likes.push(email);

    isPosted = await (() => 
            new Promise((resolve, reject) => {
                db.collection(NEWS_COLL_NAME).updateOne( {_id: ObjectId(newsId)}, 
                    { $set: {
                            rating: news.rating,
                            likes: news.likes
                        }
                    },
                    (err, result) => {
                        if (err) {
                            res.status(400);
                            reject(err);
                        }
                        resolve(result);
                });
            })
        )();
    db.close();
    res.json({
        message: `News ${newsId} user ${email} like posted`,
        currentRating: news.rating
    });    
}


async function postProjectComments(req, res, next) {
    let projectId = req.params.id;
    let username = req.body.username;
    let message = req.body.message;
    let project;
    let isPosted;
    let db;

    db = await connectDB();
    project = await (() => 
            new Promise((resolve, reject) => {
                db.collection(PROJECT_COLL_NAME).findOne({_id: ObjectId(projectId)},
                    (err, result) => {
                    if (err || result === null) {
                        res.status(400);
                        reject(err || new Error(`Project id ${projectId} doesn\'t exist`));
                    }
                    resolve(result);
                });
            })
        )();
    
    
    isPosted = await (() => 
            new Promise((resolve, reject) => {
                db.collection(PROJECT_COLL_NAME).updateOne({_id: ObjectId(projectId)}, 
                    {$push: 
                     {comments: {
                         username: username,
                         message: message,
                         date: new Date()
                     }}
                    },
                    (err, result) => {
                        if (err) {
                            res.status(400);
                            reject(err);
                        }
                        resolve(result);
                });
            })
        )();

    db.close();
    res.json({
        message: `User ${username} commented project: ${message}`
    });   
}

async function postNewsComments(req, res, next) {
    let newsId = req.params.id;
    let username = req.body.username;
    let message = req.body.message;
    let news;
    let isPosted;
    let db;

    db = await connectDB();
    news = await (() => 
            new Promise((resolve, reject) => {
                db.collection(NEWS_COLL_NAME).findOne({_id: ObjectId(newsId)},
                    (err, result) => {
                    if (err || result === null) {
                        res.status(400);
                        reject(err || new Error(`News id ${newsId} doesn\'t exist`));
                    }
                    resolve(result);
                });
            })
        )();
    
    
    isPosted = await (() => 
            new Promise((resolve, reject) => {
                db.collection(NEWS_COLL_NAME).updateOne({_id: ObjectId(newsId)}, 
                    {$push: 
                     {comments: {
                         username: username,
                         message: message,
                         date: new Date()
                     }}
                    },
                    (err, result) => {
                        if (err) {
                            res.status(400);
                            reject(err);
                        }
                        resolve(result);
                });
            })
        )();

    db.close();
    res.json({
        message: `User ${username} commented news: ${message}`
    });   
}

async function postMessage(req, res, next) {
    let email = req.body.email;
    let author = req.body.author;
    let subject = req.body.subject;
    let text = req.body.text;

    let addMessage;
    let db;

    db = await connectDB();
    addMessage = await (() => 
            new Promise((resolve, reject) => {
                db.collection(MESSAGE_COLL_NAME).save({
                    author: author,
                    email: email,
                    subject: subject,
                    body: text,
                    date: new Date(),
                    new: true
                }, 
                (err, result) => {
                        if (err) {
                            res.status(400);
                            reject(err);
                        }
                        resolve(result);
                });
            })
        )();
    db.close();
    res.json({
        message: `User ${author} send message!`
    });    
}

module.exports = {
    promiseWrapper,
    restifyDB,
    postProjectLike: promiseWrapper(postProjectLike),
    postNewsLike: promiseWrapper(postNewsLike),
    postProjectComments: promiseWrapper(postProjectComments),
    postNewsComments: promiseWrapper(postNewsComments),
    postMessage: promiseWrapper(postMessage)
}
