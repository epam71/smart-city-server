'use strict';
const fs = require('fs');
const path = require('path');
const request = require('request');
const dbAgent = require('./db-agent');
const validator = require('./validator');

const AUTH_MAP_FILE = path.join(process.cwd(),'/modules/auth-map.json');
const DEFAULT_GUEST_TOKEN = 'guest';
const DEFAULT_GUEST_ROLE = 'guest';
const ROOT_ROLE = 'root';
const USER_INFO_URL = 'https://smart-city-lviv.eu.auth0.com/userinfo';
const AUTH0_ROLE_FIELD = 'https://role';
const AUTH0_EMAIL_FIELD = 'https://email';
let authMap;
let loggedUsers = [];
//basically we have four access level
//root, investor, user, guest
class LoggedUser {
    constructor(username, accessToken, role) {
        this.username = username;
        this.accessToken = accessToken;
        this.role = role;
    }
}

function isUserLogged(username, accessToken) {
    let role = '';
    let user = loggedUsers.find(el => el.username === username);

    if (user) {
        if (user.accessToken === accessToken) {
            role = user.role;
        } else {
            loggedUsers = loggedUsers.filter(el => el.username !== username);
        }
    }

    return role;
}

function login(userName, password, done) {
    let role;

    if (password === DEFAULT_GUEST_TOKEN) {
        return done( null, { 
            userName,
            role: DEFAULT_GUEST_ROLE 
        }); 
    } else if (!userName || !password) {
        done(new Error('Wrong username or token' + (!password ? ', empty token!': '')));
    } else if ((role = isUserLogged(userName, password))) {
        return done( null, { 
            userName,
            role 
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
                    let addWarn = '';

                    try {
                        ob = JSON.parse(body);
                    } catch (err) {
                        addWarn = body === 'Too Many Requests' ? ', please try later': '';
                        done(new Error(`Auth0 - ${body}${addWarn}`));
                        return;
                    }
                    if (ob.hasOwnProperty(AUTH0_ROLE_FIELD) &&
                        ob.hasOwnProperty(AUTH0_EMAIL_FIELD) && 
                        ob[AUTH0_EMAIL_FIELD] === userName) {
                        loggedUsers.push(new LoggedUser(userName, password, ob[AUTH0_ROLE_FIELD]));
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

function accessControl(req, res, next) {
    const anyValue = '*';
    let user = req.user;    

    if (!dbAgent.isStaticImg(req) && !authMap.find(el => 
            (el.method === anyValue || el.method === req.method) &&
            (el.path === anyValue || req.url.match(new RegExp(el.path))) &&
            (el.role === anyValue || el.role === user.role)
        )) {

        res.status(401);
        next(new Error(`Unauthorized ${user.userName} ${req.method} ${req.url}`));
        return;
    }
    next();
}

function readReadAuthMap() {
    try {
        authMap = JSON.parse(fs.readFileSync(AUTH_MAP_FILE));
    } catch(err) {
        console.log('Auth map confiration error');
    }
}

function writeReadAuthMap() {
    fs.writeFileSync(AUTH_MAP_FILE, JSON.stringify(authMap));
}    

function getAuthMap(req, res, next) {
    res.json(authMap);
}

function posAuthMap(req, res, next) {
    let isValidAuthMap = validator.isValidAuthMap(req);
    let tempAuthMap = authMap;

    if (isValidAuthMap.error) {
        next(isValidAuthMap.error);
        return;
    }
 
    try {
        authMap = req.body;
        authMap.sort((a, b) => a.path + a.method + a.role <= b.path + b.method + b.role ? -1 : 1 );
        writeReadAuthMap();
        res.json({message: 'Auth map has been updated'});
    } catch(err) {
        authMap = tempAuthMap;
        next(err);
    }
}

readReadAuthMap();

module.exports = {
    login,
    accessControl: dbAgent.promiseWrapper(accessControl),
    getAuthMap: dbAgent.promiseWrapper(getAuthMap),
    postAuthMap: dbAgent.promiseWrapper(posAuthMap),
}
