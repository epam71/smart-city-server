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

passport.use(new BasicStrategy(authModule.login));

app.use((req, res, next) => {
    let t = 't';

    next();
});

app.use(bodyParser.json());
app.use(methodOverride());
app.use(cors());
//during developing phase we activate passport mode only via setting USE_PASSPORT
if (!process.env.PORT || process.env.USE_PASSPORT) {
    app.use(passport.authenticate('basic', { session: false }));
    app.use(authModule.accessControl);
}
app.route(`${dbAgent.API_PREFIX}/auth-map` )
    .get(authModule.getAuthMap)
    .post(authModule.postAuthMap);
app.get(`${dbAgent.API_PREFIX}/auth-test`, authModule.checkUser);
app.post(`${dbAgent.API_PREFIX}/projects/:id/likes`, dbAgent.postProjectLike);

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
