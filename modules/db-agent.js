'use strict';
const DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-city';
const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');
const restify = require('express-restify-mongoose');
const passwordHash = require('password-hash');

const validator = require('./validator');
const dbSchemes = require('./db-schemes');
//--------------------------------------------------------------------------------
const USER_COLL_NAME = 'users';
const PROJECT_COLL_NAME = 'projects';
const NEWS_COLL_NAME = 'news';
const MESSAGE_COLL_NAME = 'messages';
//--------------------------------------------------------------------------------
function promiseWrapper(func) {
    return (req, res, next) => {
        new Promise((resolve,reject) => resolve(func(req,res,next)))
            .catch(err => next(err));
    };
}
//--------------------------------------------------------------------------------
function userValidator(req, res, next) {
    const isUserValid = validator.isUserValid(req);

    if (isUserValid.error) {
        res.status(400);
        next(isUserValid.error);
    }
    req.body.password = passwordHash.generate(req.body.password);
    next();
}
//--------------------------------------------------------------------------------
function restifyUsers(router) {
    const userURI = restify.serve(
        router,
        mongoose.model(
            USER_COLL_NAME,
            dbSchemes.userScheme
            ),{
                preCreate: promiseWrapper(userValidator)
            });

    console.log(`User URI : ${userURI}`);
}
//--------------------------------------------------------------------------------
function restifyProjects(router) {
    const projectsURI = restify.serve(
        router,
        mongoose.model(
            PROJECT_COLL_NAME,
            dbSchemes.projects
            ));

    console.log(`project URI : ${projectsURI}`);
}
//--------------------------------------------------------------------------------
function restifyNews(router) {
    const newsURI = restify.serve(
        router,
        mongoose.model(
            NEWS_COLL_NAME,
            dbSchemes.news
            ));

    console.log(`news URI : ${newsURI}`);
}
//--------------------------------------------------------------------------------
function restifyMessages(router) {
    const messagesURI = restify.serve(
        router,
        mongoose.model(
            MESSAGE_COLL_NAME,
            dbSchemes.messages
            ));

    console.log(`messages URI : ${messagesURI}`);
}
//--------------------------------------------------------------------------------
function restifyDB(router, onError) {
    restify.defaults({
        prefix: '/api',
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
        restifyUsers(router);
        restifyProjects(router);
        restifyNews(router);
        restifyMessages(router);
    });
}
//--------------------------------------------------------------------------------
module.exports = {
    restifyDB
};
