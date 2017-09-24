'use strict';
const PORT = process.env.PORT || 8000;
const path = require('path');
const express = require('express');
const app = express();
const router = express.Router();
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cors = require('cors');
const passport = require('passport');
const BasicStrategy = require('passport-http').BasicStrategy;

const dbAgent = require('./modules/db-agent');
const authModule = require('./modules/auth-module');
const mailSender = require('./modules/mail-sender');

const CONTROL_AUTH = !process.env.PORT || process.env.USE_PASSPORT;
const REQ_SIZE_LIMIT = 5242880;

passport.use(new BasicStrategy(authModule.login));


app.use(cors());
app.use((req, res, next) => {
    console.log(`1) Authorization in header: ${req.url}: ${req.headers.authorization}`);
    if (CONTROL_AUTH && !req.headers.authorization) {
        res.status(400);
        next(new Error('Empty authorization data!'));
        return;
    }
    next();
});

app.use(bodyParser.json(
    {
        limit: REQ_SIZE_LIMIT
    }
));
app.use(methodOverride());
//during developing phase we activate passport mode only via setting USE_PASSPORT
if (CONTROL_AUTH) {
    app.use(passport.authenticate('basic', { session: false }));
    app.use(authModule.accessControl);
}
app.route(`/auth-map` )
    .get(authModule.getAuthMap)
    .post(authModule.postAuthMap);
app.get('/auth-test', authModule.checkUser);
app.post('/projects/:id/likes', dbAgent.postLikes);
app.post('/news/:id/likes', dbAgent.postLikes);
app.post('/projects/:id/comments', dbAgent.postComments);
app.post('/news/:id/comments', dbAgent.postComments);
app.post('/notifications', mailSender.sendEmail);

dbAgent.restifyDB(router, onError);
app.use(router);
app.use(onError);

app.listen(PORT, () => console.log(`Server started on port: ${PORT}`));

function onError(err, req, res, next) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    res.json({
        errorMessage: err.message,
        stack: err.stack
    });
}
