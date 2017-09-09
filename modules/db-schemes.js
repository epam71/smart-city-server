'use strict';
const mongoose = require('mongoose');
//--------------------------------------------------------------------------------
const userScheme = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String
    },
    password: {
        type: String,
        required: true
    }
});
//--------------------------------------------------------------------------------
module.exports = {
    userScheme
}