/**
 * Copyright (c) 2014 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
var express = require('../express-jaeger').express,
    passport = require('passport'),
    _localStrategy = require('passport-local').Strategy,
    _facebookStrategy = require('passport-facebook').Strategy,
    _googleStrategy = require('passport-google-oauth').OAuth2Strategy,
    _githubStrategy = require('passport-github').Strategy,
    https = require('https'),
    user = require('../../engine/api/v1/users'),
    authorization = require('./authorization'),
    logger = require('./../logger').init(),
    schemaValidator = require('./../schema-validator'),
    schemas = require('./../schema-validator/schemas'),
    errBuilder = require('./../errorHandler').errBuilder,
    userLockManager = require('./userLockManager'),
    userValidator = require('./userValidator'),
    Q = require('q'),
    socialLoginProvider = require('./socialLoginProvider');

var strategyOptions = {failureRedirect: '/auth', failureFlash: false, session: false};

var verifyUser = function (username, password, emailVerificationRequired, done) {
    user.searchUser(username, function (err, us) {
        if (!us) {
            done(null, false);
        } else {
            Q.fcall(function () {
                userLockManager.isUserLocked(username)
                    .then(function userLocked(lockPeriod) {
                        logger.info('Authentication - user has been locked for: ' + lockPeriod + ' seconds.');
                        done(null, false, userLockManager.userLockedMsg());
                    }, function notLocked() {
                        userValidator.isPasswordCorrect(password, us)
                            .then(function passwordVerified() {
                                userValidator.isEmailVerified(us, emailVerificationRequired)
                                    .then(function emailVerified() {
                                        delete(us.password);
                                        delete(us.salt);
                                        userLockManager.removeLockForUser(username)
                                            .fail(function () {
                                                logger.error('unable to reset login failed counter for username: ' + username);
                                            })
                                            .finally(function () {
                                                done(null, us);
                                            });
                                    }, function emailNotVerified() {
                                        done(null, false, errBuilder.build(errBuilder.Errors.User.EmailNotVerified));
                                    });
                            }, function passwordInvalid() {
                                logger.warn('authentication. localStrategy. passwords matching failed for username: ' + username);
                                userLockManager.incrementLoginFailedCount(username)
                                    .fail(function () {
                                        logger.error('unable to increment login failed counter for username: ' + username);
                                    })
                                    .finally(function () {
                                        done(null, false);
                                    });
                                    done(null, false);
                            });
                    });
            });
        }
    });
};

var handleCallback = function (email, provider, done) {
    // find the user in the api
    user.searchUser(email, function (err, us) {
        if (us) {
            // user already exists, continue log in
            done(null, us);
        } else {
            // user doesn't exist, create it without a domain
            var newUser = {
                email: email,
                verified: true,
                provider: provider
            };
            user.addUser(newUser, false /* do not send email validation*/, function (err, result) {
                done(err, result || false);
            });
        }
    });
};

var configureFacebookStrategy = function (config) {
    if (socialLoginProvider.isFacebookAvailable()) {
        var strategy = new _facebookStrategy({
                clientID: config.facebook.clientID,
                clientSecret: config.facebook.clientSecret,
                callbackURL: config.facebook.callbackURL
            },

            // handle facebook callback
            function (token, refreshToken, profile, done) {
                handleCallback(profile.emails[0].value, 'Facebook', done);
            });
        passport.use(strategy);
    }
};

var configureGoogleStrategy = function (config) {
    if (socialLoginProvider.isGoogleAvailable()) {
        var strategy =  new _googleStrategy({
                clientID: config.google.clientID,
                clientSecret: config.google.clientSecret,
                callbackURL: config.google.callbackURL
            },

            // handle google callback
            function (accessToken, refreshToken, profile, done) {
                handleCallback(profile.emails[0].value, 'Google', done);
            });
        passport.use(strategy);
    }
};

var configureGithubStrategy = function (config) {
    if (socialLoginProvider.isGithubAvailable()) {
        var strategy = new _githubStrategy({
                clientID: config.github.clientID,
                clientSecret: config.github.clientSecret,
                callbackURL: config.github.callbackURL
            },

            // handle github callback
            function (accessToken, refreshToken, profile, done) {
                //pasport-github doesn't include user email on the profile, we need to get it
                var options = {
                    hostname: 'api.github.com',
                    path: '/user/emails',
                    method: 'GET',
                    headers: {
                        'User-Agent': 'nodejs',
                        Authorization: 'token ' + accessToken
                    }
                };
                https.get(options, function (res) {
                    if (res.statusCode === 200) {
                        var data = '';
                        res.on('data', function (chunk) {
                            data += chunk;
                        }).on('end', function () {
                            var emails = JSON.parse(data);
                            handleCallback(emails[0].email, 'Github', done);
                        });
                    } else {
                        done(res.statusText);
                    }
                })
                    .on('error', function (e) {
                        done(e);
                    });
            });
        passport.use(strategy);
    }
};

var localStrategy = new _localStrategy(
    function (username, password, done) {
        verifyUser(username, password, true, done);
    }
);

var localStrategyCallback = function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            if (info && info.status) {
                next(info);
            } else {
                next(errBuilder.build(errBuilder.Errors.Generic.NotAuthorized));
            }
        } else {
            req.user = user;
            return next();
        }
    }, {'session': false})(req, res, next);
};

var refreshToken = function (req, res, next) {
    if (!req.identity) {
        res.status(errBuilder.Errors.Generic.NotAuthorized.code).send(errBuilder.Errors.Generic.NotAuthorized.message);
    } else {
        user.getUser(req.identity, function (err, us) {
            if (err) {
                res.send(err);
            } else {
                req.user = us;
                next();
            }
        });
    }
};

var getCurrentUser = function (req, res, next) {
    if (!req.identity) {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        res.status(errBuilder.Errors.Generic.NotAuthorized.code).send(errBuilder.Errors.Generic.NotAuthorized.message);
    } else {
        user.getUser(req.identity, function (err, us) {
            if (err) {
                next(err);
            } else {
                if (us) {
                    delete(us.password);
                    delete(us.salt);
                }
                res.status(200).send(us);
            }
        });
    }
};

module.exports = function (cfg, forceSSL) {
    var app = express();
    app.disable('x-powered-by');
    if(forceSSL){
        app.use(forceSSL);
    }

    app.use(passport.initialize());

    configureFacebookStrategy(cfg);
    configureGoogleStrategy(cfg);
    configureGithubStrategy(cfg);

    passport.use(localStrategy);

    app.get('/api/auth/me', getCurrentUser);
    app.get('/auth/me', getCurrentUser);

    app.put('/auth/me', refreshToken,
        authorization.getAuthToken({followRedirect: false})
    );

    app.delete('/auth/me', authorization.deleteAuthToken);

    app.post('/auth/local',
        localStrategyCallback,
        authorization.getAuthToken({followRedirect: false})
    );

    app.post('/api/auth/token',
        schemaValidator.validateSchema(schemas.authorization.AUTH),
        localStrategyCallback,
        authorization.getAuthToken({followRedirect: false})
    );

    app.get('/auth/facebook', passport.authenticate('facebook', {session: false, scope: 'email'}));
    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', strategyOptions),
        authorization.getAuthToken({followRedirect: true})
    );
    app.get('/auth/google', passport.authenticate('google', {
        session: false,
        scope: 'https://www.googleapis.com/auth/userinfo.email'
    }));
    app.get('/auth/google/callback',
        passport.authenticate('google', strategyOptions),
        authorization.getAuthToken({followRedirect: true})
    );
    app.get('/auth/github', passport.authenticate('github', {'session': false, scope: 'user:email'}));
    app.get('/auth/github/callback',
        passport.authenticate('github', strategyOptions),
        authorization.getAuthToken({followRedirect: true})
    );

    app.get('/auth/social/config', socialLoginProvider.getSocialLoginConfig);

    return app;
};
