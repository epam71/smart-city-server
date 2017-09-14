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
    desc: String,
    image: String,
    category:   String,
    goals: String,
    result: String,
    rating: { 
        type: Number, 
        default: 0 
    },
    date: { 
        type: Date, 
        default: Date.now 
    },
    commercial: Boolean,
    budget: Number,
    approved: { 
        type: Boolean, 
        default: false 
    },
    done: { 
        type: Boolean, 
        default: false
    },
    comments: [{
        username: String,
        message: String,
        date: { 
            type: Date, 
            default: Date.now 
        },
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
    status: {
        type: String,
        enum: ['new', 'active', 'edited', 'closed']
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
