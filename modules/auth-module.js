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
const AUTH0_EXPIRATION_INTERVAL = ( 24 * 60 * 60 - 1) * 1000; 
const CLIENT_TOKEN_URL = 'https://smart-city-lviv.eu.auth0.com/oauth/token';
const AUTH0_TOKEN_GENERATOR = {
    grant_type:"client_credentials",
    client_id: process.env.client_id,
    client_secret: process.env.client_key,
    audience: "https://smart-city-lviv.eu.auth0.com/api/v2/"
}
const AUTH0_USER_URL = 'https://smart-city-lviv.eu.auth0.com/api/v2/users';

let clientToken = '';
let clientTokenExpiredAt = 0;
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

    if (!authMap.find(el => 
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

function refreshAuthMap() {
    authMap = authMap || [];

    dbAgent.readAuthMap()
        .then( res => {
            authMap = res
        })
        .catch( err => 
            console.log(`Auth map configuration error: ${err}`)
        );
}

function getClientToken(next) {
    return new Promise((resolve, reject) => {
        request.post({
            url: CLIENT_TOKEN_URL,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(AUTH0_TOKEN_GENERATOR)
        }, 
        (err, subRes, body) => {
            if (err) {
                next(err);
                return;
            }
            resolve(JSON.parse(body).access_token);
        });
    });
}

async function getUsers(req, res, next) {

    if (clientTokenExpiredAt < Date.now()) {        
        clientToken = await getClientToken(next);
        clientTokenExpiredAt = Date.now() + AUTH0_EXPIRATION_INTERVAL;
    }

    request.get( { 
        url: AUTH0_USER_URL,
        headers: {'Authorization': `Bearer ${clientToken}`}
    }, 
    (err, subRes, body) => {
        if (err) {
            next(err);
            return;
        }
        res.json({usersCount: JSON.parse(body).length});
    });
}

refreshAuthMap();

module.exports = {
    login,
    accessControl: dbAgent.promiseWrapper(accessControl),
    getUsers: dbAgent.promiseWrapper(getUsers),
    refreshAuthMap
}
