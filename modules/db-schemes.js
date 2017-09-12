'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
//--------------------------------------------------------------------------------
const userScheme = new Schema({
    name: {
        type: String,
        required: true,
        max: 30
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

const projects = new Schema({
    author: {
        type: String,
        required: true,
        max: 30
    },
    projectName:  {
        type: String,
        required: true,
    },
    shortDesc: String,
    desc: String,
    image: String,
    category:   String,
    goals: String,
    result: String,
    rating: Number,
    date: { type: Date, default: Date.now },
    commercial: Boolean,
    budget: Number,
    approved: Boolean,
    done: Boolean,
    comments: [{
        username: String,
        message: String,
        date: Date 
    }],
});

const news = new Schema({
    author: {
        type: String,
        required: true,
        max: 30
    },
    title: {
        type: String,
        required: true
    },
    image: String,
    desc: String,
    shortDesc: Script,
    approved: Boolean,
    date: { type: Date, default: Date.now },
    comments: [{
        username: String,
        message: String,
        date: Date 
    }],
});

const messages = new Schema({
    author: {
        type: String,
        required: true,
        max: 30
    },
    email: {
        type: String,
        required: true
    },
    subject: String,
    body: String,
    date: Date
});

//--------------------------------------------------------------------------------
module.exports = {
    userScheme: userScheme,
    projects: projects,
    news: news,
    messages: messages
}