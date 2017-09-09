'use strict';
const Joi = require('joi');

const MIN_USERNAME_LENGTH = 5;
const MAX_USERNAME_LENGTH = 20;
const MIN_PASSWORD_LENGTH = 5;
const MAX_PASSWORD_LENGTH = 20;
//--------------------------------------------------------------------------------
function isUserValid(req) {
    const userScheme = Joi.object().keys({
        name: Joi.string().alphanum().min(MIN_USERNAME_LENGTH)
            .max(MAX_USERNAME_LENGTH).required(),
        email: Joi.string().email().required(),
        password: Joi.string().alphanum().min(MIN_PASSWORD_LENGTH)
            .max(MAX_PASSWORD_LENGTH).required()
    });

    return Joi.validate(req.body,userScheme);
}
//--------------------------------------------------------------------------------
module.exports = {
    isUserValid
};
