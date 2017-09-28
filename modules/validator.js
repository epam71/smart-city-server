'use strict';
const Joi = require('joi');

const MIN_USERNAME_LENGTH = 5;
const MAX_USERNAME_LENGTH = 20;
const MIN_PASSWORD_LENGTH = 5;
const MAX_PASSWORD_LENGTH = 20;
const EMAIL = [ /^[\w._%+-]+@[\w.-]+\.[a-z]{2,3}$/, 'Value must be a valid email'];

function isIdFilled(req) {
    const scheme = Joi.object().keys({
        id: Joi.string().required()
    });

    return Joi.validate(req.params,scheme);
}

function isIdCommentIdFilled(req) {
    const scheme = Joi.object().keys({
        id: Joi.string().required(),
        commentId: Joi.string().required()
    });

    return Joi.validate(req.params,scheme);
}

function isEmailFilled(req) {
    const scheme = Joi.object().keys({
        email: Joi.string().email().required()
    });

    return Joi.validate(req.body,scheme);
}

function isValidAuthMap(req) {
    const authMapScheme = Joi.array().items( {
        method: Joi.string().allow('POST', 'GET', 'PUT', 'PATCH','DELETE', '*').required(),
        path: Joi.string().required(),
        role: Joi.string().allow('root', 'investor', 'user', 'guest').required(),
    }).min(1);

    return Joi.validate(req.body, authMapScheme);    
}

function isEmailBodyValid(req) {
    const scheme = Joi.object().keys({
        email: Joi.string().email().required(),
        subject: Joi.string().required(),
        text: Joi.string().required(),
        html: Joi.string().required()
    });

    return Joi.validate(req.body,scheme);
}

function isValidComment(req) {
    const scheme = Joi.object().keys({
        username: Joi.string().email().required(),
        message: Joi.string().required().required()
    });

    return Joi.validate(req.body,scheme);
}    

module.exports = {
    isValidAuthMap,
    isIdFilled,
    isIdCommentIdFilled,
    isEmailFilled,
    isEmailBodyValid,
    isValidComment,
    EMAIL
};
