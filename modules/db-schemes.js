'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const validator = require('./validator');

const projects = new Schema({
    author: {
        type: String,
        required: true,
        max: 30
    },
    authorEmail: {
        type: String,
        required: true,
        match: validator.EMAIL
    },
    projectName:  {
        type: String,
        required: true,
    },
    desc: String,
    image: String,
    imageKey: String,
    goals: String,
    result: String,
    rating: { 
        type: Number, 
        default: 0 
    },
    likes: [{
        type: String,
        required: true,
        match: validator.EMAIL
    }],
    date: { 
        type: Date, 
        default: Date.now 
    },
    commercial: Boolean,
    budget: { 
        type: Number, 
        default: 0 
    },
    status: {
        type: String,
        enum: ['new', 'active', 'edited', 'closed']
    },
    approved: { 
        type: Boolean, 
        default: false 
    },
    comments: [{
        username: {
            type: String,
            required: true,
            match: validator.EMAIL
        },
        message: {
            type: String,
            required: true
        },
        date: { 
            type: Date, 
            default: Date.now 
        }
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
    imageKey: String,
    desc: String,
    approved: Boolean,
    date: {
        type: Date,
        default: Date.now
    },
    rating: { 
        type: Number, 
        default: 0 
    },
    likes: [{
        type: String,
        required: true,
        match: validator.EMAIL
    }],
    comments: [{
        username: {
            type: String,
            required: true,
            match: validator.EMAIL
        },
        message: {
            type: String,
            required: true
        },
        date: { 
            type: Date,
            default: Date.now
        }
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
        required: true,
        match: validator.EMAIL
    },
    subject: String,
    body: String,
    date: { 
        type: Date,
        default: Date.now
    },
    new: {
        type: Boolean,
        default: true
    }
});

const AUTH_MAPS = {
    method: {
        type: String,
        required: true,
        enum: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE', '*']
    },
    path: {
        type: String,
        required: true        
    },
    role : {
        type: String,
        required: true,
        enum: ['root', 'user', 'guest', 'investor', '*']
    }
}

module.exports = {
    projects,
    news,
    messages,
    AUTH_MAPS
}
