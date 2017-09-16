'use strict';
const fs = require('fs');
const path = require('path');
const request = require('request');
const dbAgent = require('./db-agent');
const validator = require('./validator');
//--------------------------------------------------------------------------------
const AUTH_MAP_FILE = path.join(process.cwd(),'/modules/auth-map.json');
const DEFAULT_GUEST_TOKEN = 'guest';
const DEFAULT_GUEST_ROLE = 'guest';
const ROOT_ROLE = 'root';
const USER_INFO_URL = 'https://smart-city-lviv.eu.auth0.com/userinfo';
const AUTH0_ROLE_FIELD = 'https://role';
const AUTH0_EMAIL_FIELD = 'https://email';
const apiMaskRegExp = new RegExp( `^${dbAgent.API_PREFIX}`);
let authMap;
//basically we have four access level
//root, investor, user, guest
//--------------------------------------------------------------------------------
function isAPIRequest(req) {
    return req.url.match(apiMaskRegExp);
}
//--------------------------------------------------------------------------------
function login(userName, password, done) {
    if (password === DEFAULT_GUEST_TOKEN || !userName || !password) {
        return done( null, { 
            userName,
            role: DEFAULT_GUEST_ROLE 
        });            
    } else {
        //here we go to auth0 and verify the user
        //password is our accessToken
        request.get( { 
                url: USER_INFO_URL,
                headers: {'Authorization': `Bearer ${password}`}
            }, 
            (err, res, body) => {
                if (err) {
                    done(err);
                } else {
                    let ob;

                    try {
                        ob = JSON.parse(body);
                    } catch (err) {
                        done(new Error('Wrong auth0 user profile'));
                        return;
                    }
                    if (ob.hasOwnProperty(AUTH0_ROLE_FIELD) &&
                        ob.hasOwnProperty(AUTH0_EMAIL_FIELD) && 
                        ob[AUTH0_EMAIL_FIELD] === userName) {
                        done(null, { 
                            userName,
                            role: ob[AUTH0_ROLE_FIELD]
                        });    
                    } else {
                        done(new Error('Wrong auth0 user profile'));
                    }                    
                }
        });
    }
}
//--------------------------------------------------------------------------------
function accessControl(req, res, next) {
    const anyValue = '*';
    let user = req.user;    

    if (isAPIRequest(req) && !authMap.find(el => 
            (el.method === anyValue || el.method === req.method) &&
            (el.path === anyValue || req.url.indexOf(el.path) === 0) &&
            ( el.role === anyValue || el.role === user.role)
        )) {

        res.status(401);
        next(new Error(`Unauthorized ${user.userName} ${req.method} ${req.url}`));
    }
    next();
}
//--------------------------------------------------------------------------------
function readReadAuthMap() {
    try {
        authMap = JSON.parse(fs.readFileSync(AUTH_MAP_FILE));
    } catch(err) {
        console.log('Auth map confiration error');
    }
}
//--------------------------------------------------------------------------------
function writeReadAuthMap() {
    fs.writeFileSync(AUTH_MAP_FILE, JSON.stringify(authMap));
}    
//--------------------------------------------------------------------------------
function getAuthMap(req, res, next) {
    res.json(authMap);
}
//--------------------------------------------------------------------------------
function posAuthMap(req, res, next) {
    let isValidAuthMap = validator.isValidAuthMap(req);
    let tempAuthMap = authMap;

    if (isValidAuthMap.error) {
        next(isValidAuthMap.error);
    }
 
    try {
        authMap = req.body;
        writeReadAuthMap();
        res.json({message: 'Auth map has been updated'});
    } catch(err) {
        authMap = tempAuthMap;
        next(err);
    }
}
//--------------------------------------------------------------------------------
function checkUser(req, res, next) {
    let resObj = {message: 'Server identify the user'};

    Object.assign(resObj,req.user);    
    res.json(resObj)
}
//--------------------------------------------------------------------------------
readReadAuthMap();
//--------------------------------------------------------------------------------
module.exports = {
    login,
    accessControl: dbAgent.promiseWrapper(accessControl),
    getAuthMap: dbAgent.promiseWrapper(getAuthMap),
    postAuthMap: dbAgent.promiseWrapper(posAuthMap),
    checkUser: dbAgent.promiseWrapper(checkUser)
}
