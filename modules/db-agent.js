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
const API_PREFIX = '/api';

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
        prefix: API_PREFIX,
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
        message: `Project ${projectId} user ${email} like posted`
    });    
}

module.exports = {
    API_PREFIX,
    promiseWrapper,
    restifyDB,
    postProjectLike: promiseWrapper(postProjectLike)
}
