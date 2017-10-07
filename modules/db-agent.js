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
const AUTH_COLL_NAME = 'auth-maps';

let funcRefreshAuthMap;

function promiseWrapper(func) {
    return (req, res, next) => {
        new Promise((resolve,reject) => resolve(func(req,res,next)))
            .catch(err => next(err));
    };
}

async function preDelete(req, res, next) {
    if  (req.params && !req.params.hasOwnProperty('id')){
        res.status(400);
        next(new Error('To delete item you need to enter id.'));
        return;
    }    
    next();
}

async function readAuthMap() {
    let db = await connectDB();

    return new Promise((resolve, reject) => {
        db.collection(AUTH_COLL_NAME).find({}).toArray( (err, res) => {
            if (err) {
                console.log('Unable get auth map data from database');
                reject(err);
            }
            resolve(res);
        });
    })
}

function setAuthMapRefresher(handler) {
    funcRefreshAuthMap = handler;
}

function  refreshAuthMap(req, res, next ) {
    if (funcRefreshAuthMap) {
        funcRefreshAuthMap();
    }
    next();
}

function restifyAuthMaps(router) {
    const authMapsURI = restify.serve(
        router,
        mongoose.model(
            AUTH_COLL_NAME,
            new mongoose.Schema(
                dbSchemes.AUTH_MAPS, 
                { strict: true }
            )
        ),
        {
            postCreate: refreshAuthMap,
            postDelete: refreshAuthMap,
            postUpdate: refreshAuthMap
        });

    console.log(`Auth-maps URI : ${authMapsURI}`);
}


function restifyProjects(router) {
    const projectsURI = restify.serve(
        router,
        mongoose.model(
            PROJECT_COLL_NAME,
            dbSchemes.projects
        ),
        {
            preDelete: promiseWrapper(preDelete)
        });

    console.log(`project URI : ${projectsURI}`);
}

function restifyNews(router) {
    const newsURI = restify.serve(
        router,
        mongoose.model(
            NEWS_COLL_NAME,
            dbSchemes.news
        ),
        {
            preDelete: promiseWrapper(preDelete)
        });

    console.log(`news URI : ${newsURI}`);
}

function restifyMessages(router) {
    const messagesURI = restify.serve(
        router,
        mongoose.model(
            MESSAGE_COLL_NAME,
            dbSchemes.messages
        ),
        {
            preDelete: promiseWrapper(preDelete)
        });

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
        restifyAuthMaps(router);
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

async function postLikes(req, res, next) {
    let isIdFilled = validator.isIdFilled(req);
    let isEmailFilled = validator.isEmailFilled(req);
    let paramsId = req.params.id;
    let email = req.body.email;
    let dbCollName = req.url.split("/")[1];
    let collName;
    let isPosted;
    let db;

    if (isIdFilled.error || isEmailFilled.error) {
        next(isIdFilled.error || isEmailFilled.error);
        return;
    }

    db = await connectDB();
    collName = await
        new Promise((resolve, reject) => {
            db.collection(dbCollName).findOne({_id: ObjectId(paramsId)},
                (err, result) => {
                if (err || result === null) {
                    res.status(400);
                    reject(err || new Error(`This id ${paramsId} doesn\'t exist`));
                }
                resolve(result);
            });
        });

    collName.likes = collName.likes || [];
    collName.rating = typeof collName.rating !== 'number' || isNaN(collName.rating) ? 0 :collName.rating;
    
    let index = collName.likes.indexOf(email);
    if (index >= 0) {
        collName.rating -= 1;
        collName.likes.splice(index, 1);
    }
    else{
        collName.rating += 1;
        collName.likes.push(email);
    }

    isPosted = await
        new Promise((resolve, reject) => {
            db.collection(dbCollName).updateOne( {_id: ObjectId(paramsId)}, 
                { $set: {
                        rating: collName.rating,
                        likes: collName.likes
                    }
                },
                (err, result) => {
                    if (err) {
                        res.status(400);
                        reject(err);
                    }
                    resolve(result);
            });
        });

    db.close();
    res.json({
        currentRating: collName.rating
    });    
}

async function postComments(req, res, next) {
    let isIdFilled = validator.isIdFilled(req);
    let isValidcomment = validator.isValidComment(req);
    let dbCollName = req.url.split("/")[1];
    let paramsId = req.params.id;
    let username = req.body.username;
    let message = req.body.message;
    let db;

    if (isValidcomment.error || isIdFilled.error) {
        next(isValidcomment.error || isIdFilled.error);
        return;
    }

    db = await connectDB();
    await new Promise((resolve, reject) => {
            db.collection(dbCollName).findOne({_id: ObjectId(paramsId)},
                (err, result) => {
                if (err || result === null) {
                    res.status(400);
                    reject(err || new Error(`This id ${paramsId} doesn\'t exist`));
                }
                resolve(result);
            });
        });
    
    await new Promise((resolve, reject) => {
            db.collection(dbCollName).updateOne({_id: ObjectId(paramsId)}, 
                {$push: 
                    {comments: {
                        id: new ObjectId(),
                        username: username,
                        message: message,
                        date: new Date
                    }}
                },
                (err, result) => {
                    if (err) {
                        res.status(400);
                        reject(err);
                    }
                    resolve(result);
            });
        });

    db.close();
    res.json({
        message: `Comment was successfully added!`
    });   
}

async function deleteComments(req, res, next) {
    let isIdCommentIdFilled = validator.isIdCommentIdFilled(req);
    let paramsId = req.params.id;
    let dbCollName = req.url.split("/")[1];
    let commentId = req.params.commentId;
    let db;

    if (isIdCommentIdFilled.error) {
        res.status(400);
        next(isIdCommentIdFilled.error);
        return;
    }

    db = await connectDB();
    await new Promise((resolve, reject) => {
                db.collection(dbCollName).findOne({_id: ObjectId(paramsId)},
                    (err, result) => {
                    if (err || result === null) {
                        res.status(400);
                        reject(err || new Error(`This id ${paramsId} doesn\'t exist`));
                    }
                    resolve(result);
               });
        });
    
    await new Promise((resolve, reject) => {
                db.collection(dbCollName).update({_id: ObjectId(paramsId)}, 
                    {$pull : 
                     {comments : {
                         id: ObjectId(commentId)
                     }
                     }
                    },
                    (err, result) => {
                        if (err) {
                            res.status(400);
                            reject(err);
                        }
                    resolve(result);
              });
        });

    db.close();
    res.json({
        message: `Comment deleted!`
    });   
}

module.exports = {
    promiseWrapper,
    restifyDB,
    postLikes: promiseWrapper(postLikes),
    postComments: promiseWrapper(postComments),
    deleteComments: promiseWrapper(deleteComments),
    readAuthMap,
    setAuthMapRefresher
}
