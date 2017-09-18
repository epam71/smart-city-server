'use strict';
const Joi = require('joi');

const MIN_USERNAME_LENGTH = 5;
const MAX_USERNAME_LENGTH = 20;
const MIN_PASSWORD_LENGTH = 5;
const MAX_PASSWORD_LENGTH = 20;

function isIdFilled(req) {
    const scheme = Joi.object().keys({
        id: Joi.string().required()
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
        path: Joi.string().regex(/^(\/api|[*])/).required(),
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

module.exports = {
    isValidAuthMap,
    isIdFilled,
    isEmailFilled,
    isEmailBodyValid
};
