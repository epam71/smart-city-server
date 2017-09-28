'use strict';
const DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-city';
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const mongoose = require('mongoose');
const restify = require('express-restify-mongoose');

const validator = require('./validator');
const dbSchemes = require('./db-schemes');
const imgAgent = require('./img-agent');

const PROJECT_COLL_NAME = 'projects';
const NEWS_COLL_NAME = 'news';
const MESSAGE_COLL_NAME = 'messages';

function promiseWrapper(func) {
    return (req, res, next) => {
        new Promise((resolve,reject) => resolve(func(req,res,next)))
            .catch(err => next(err));
    };
}

function isStaticImg(req) {
    return req.url.indexOf('/images') === 0
}

async function postCreate(req, res, next) {
    let id = req.erm.result.id;    
    let db, fullImgName;

    if (req.body.image) {
        fullImgName = await imgAgent.saveImg(imgAgent.formImgFilename(req, id), req.body.image)

        db = await connectDB();
        await new Promise((resolve, reject) => {
            db.collection(req.url.split('/')[ 1 ]).updateOne(
                { _id: ObjectId(id) },
                { $set: 
                    { image: fullImgName }
                },
                (err, res) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    resolve(res);
                }
            );
        })
        next();
    }
}

async function preUpdate(req, res, next) {
    let id = req.params.id;

    if (req.body.image) {
        await removeImage(req);
        imgAgent.saveImg(imgAgent.formImgFilename(req, id),req.body.image)
            .then(fullImgName => { 
                req.body.image = fullImgName;
                next();
            })
            .catch( err => next(err));
    }
}

async function preDelete(req, res, next) {
    if  (req.params && !req.params.hasOwnProperty('id')){
        res.status(400);
        next(new Error('To delete item you need to enter id.'));
        return;
    }    
    await removeImage(req);
    next();
}

async function removeImage(req) {
    let db;
    let imgFilename;

    db = await connectDB();
    return new Promise( (resolve,reject) => {
        db.collection(req.url.split('/')[ 1 ]).findOne(
            { _id: ObjectId(req.params.id) },
            { image: true },
            (err, res) => {
                if (err) {
                    throw err;
                }
                imgFilename = res.image;
                imgAgent.removeImg(imgFilename);
                resolve();
            }        
        );
    });
}

function restifyProjects(router) {
    const projectsURI = restify.serve(
        router,
        mongoose.model(
            PROJECT_COLL_NAME,
            dbSchemes.projects
        ),
        {
            postCreate: postCreate,
            preUpdate: preUpdate,
            preDelete: preDelete
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
            postCreate: postCreate,
            preUpdate: preUpdate,
            preDelete: preDelete
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
            preDelete: preDelete
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
    if (collName.likes.indexOf(email) >= 0) {
        res.status(400);
        next(new Error(`User ${email} can't post like twice`));
        return;
    }

    collName.rating += 1;
    collName.likes.push(email);

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
        message: `You liked this ${dbCollName}`,
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
    isStaticImg,
    postLikes: promiseWrapper(postLikes),
    postComments: promiseWrapper(postComments),
    deleteComments: promiseWrapper(deleteComments)    
}
