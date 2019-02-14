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

/* global getServicesConfig */

iotController.controller('LoginCtrl', function($scope,
    $rootScope,
    $window,
    $routeParams,
    usersService,
    loginService,
    sessionService,
    vcRecaptchaService,
    errorUtils,
    googleCaptchaService
) {


    $scope.username_type = getServicesConfig("usernameType");
    $scope.verifyUserEmailAsString = "verifyUserEmail_"+getServicesConfig('verifyUserEmail').toString();
    $scope.wasActivationEmailResent = false;

    function showResendActivationEmailMsg() {
        if($scope.wasResentActivationEmail === false || $scope.wasResentActivationEmail === undefined) {
            $scope.error = $rootScope.i18n.auth.email_not_verified;
            $scope.showReverificationLink = true;
        } else {
            if($scope.wasSuccessInResending === true) {
                $scope.error = $rootScope.i18n.auth.email_send;
                $scope.showReverificationLink = false;
            } else {
                $scope.error = $rootScope.i18n.auth.email_send_error;
                $scope.showReverificationLink = false;
            }
            $scope.wasResentActivationEmail = false;
            $scope.wasSuccessInResending = false;
        }
    }

    $scope.getCurrentUser = function(login) {
        loginService.currentUser(
            function (data) {
                $scope.currentUser = data;
                if(data.verified || data.provider || (!getServicesConfig('verifyUserEmail') && login)) {
                    if(data.termsAndConditions){
                        $window.location = '/ui/dashboard';
                    } else {
                        $window.location = '/ui/auth#/termsAndConditions';
                    }
                } else if (!login) {
                    if(!getServicesConfig('verifyUserEmail')) {
                        $window.location = '/ui/auth#/no_validate';
                    } else {
                        $window.location = '/ui/auth#/validate';
                    }
                } else {
                    if(data.verified === false) {
                        showResendActivationEmailMsg();
                    }
                    else {
                        $scope.error = $rootScope.i18n.auth.invalid_password;
                        $scope.showReverificationLink = false;
                    }
                }
            },
            function () {
                $scope.currentUser = '';
            }
        );
    };

    if($routeParams.jwt){
        sessionService.setJwt($routeParams.jwt);
    }

    $scope.getCurrentUser();

    function getUserLockedMsg() {
        return $rootScope.i18n.auth.user_locked;
    }

    var loginUser = function(user, login) {
        var ACCOUNT_LOCKED = 403;
        var RATE_LIMIT_EXHAUSTED = 429;
        var EMAIL_NOT_VERIFIED = 2402;
        loginService.login(user,
            function(data){
                sessionService.setJwt(data.token);
                $scope.getCurrentUser(login);
            },
            function(data, status) {
                if (status === ACCOUNT_LOCKED) {
                    $scope.error = getUserLockedMsg();
                    $scope.showReverificationLink = false;
                } else if (status === RATE_LIMIT_EXHAUSTED) {
                    $scope.error = data.message || data;
                } else if (data && data.code === EMAIL_NOT_VERIFIED) {
                    showResendActivationEmailMsg();
                } else {
                    $scope.error = $rootScope.i18n.auth.invalid_username_password;
                    $scope.password = null;
                    $scope.showReverificationLink = false;
                }
            }
        );
    };

    $scope.login = function(){
        $scope.error = null;
        var user = {
            username: $scope.email,
            password: $scope.password
        };
        loginUser(user, true);
    };

    function checkEntropy(val) {
        /*global Entropizer */
        var entropizer = new Entropizer();
        var entropy = entropizer.evaluate(val);
        if (entropy < 40) {
            return false;
        }
        return true;
    }

    $scope.requestVerifyMail = function(){
        $scope.error = null;
        var email = {
            email: $scope.email
        };

        if($scope.recaptcha.enabled) {
            var captchaData = vcRecaptchaService.data();
            if(!captchaData.response) {
                $scope.error = $rootScope.i18n.auth.captcha_missing;
                return;
            }
            email.challenge = captchaData.challenge;
            email.response = captchaData.response;
        }

        usersService.requestVerifyMail(email,
            function () {
                $scope.wasActivationEmailResent = true;
                $scope.wasSuccessInResending = true;
                if(!getServicesConfig('verifyUserEmail')) {
                    $window.location = '/ui/auth#/no_validate';
                } else {
                    $window.location = '/ui/auth#/validate';
                }
            },
            function (e) {
                $scope.error = errorUtils.extractMessageFromServerError(e);
                $scope.wasActivationEmailResent = true;
                $scope.wasSuccessInResending = false;
                vcRecaptchaService.reload(false);
            }
        );
    };

    $scope.recaptcha = {
        key:  '',
        enabled: false
    };

    $scope.init = function () {
        googleCaptchaService.getGoogleCaptchaKey(function success(data) {
            $scope.recaptcha = {
                key: data.captchaPublicKey,
                enabled: true
            };
        }, function error(){
        });
    };

    $scope.checkSocialLoginAvailability = function() {
        loginService.getSocialConfig(function success(data) {
            $scope.isFacebookAvailable = data.facebook;
            $scope.isGoogleAvailable = data.google;
            $scope.isGithubAvailable = data.github;
        }, function error() {});
    };

    $scope.checkSocialLoginAvailability();

    $scope.addUser = function(){
        if (checkEntropy($scope.password)) {
            var user = {
                email: $scope.email,
                password: $scope.password,
                verified: false,
                termsAndConditions: $scope.agreeTermsAndServices
            };

            if($scope.recaptcha.enabled) {
                var captchaData = vcRecaptchaService.data();
                if(!captchaData.response) {
                    $scope.error = $rootScope.i18n.auth.captcha_missing;
                    return;
                }
                user.challenge = captchaData.challenge;
                user.response = captchaData.response;
            }

            usersService.addUser(user, function(){
                user.username = user.email;
                if(!getServicesConfig('verifyUserEmail')) {
                    $window.location = '/ui/auth#/no_validate';
                } else {
                    $window.location = '/ui/auth#/validate';
                }
            },
            function(e){
                var msg = errorUtils.extractMessageFromServerError(e);
                if(msg === 'conflict'){
                    $scope.error = $rootScope.i18n.auth.email_conflict;
                } else {
                    $scope.error = msg;
                }
                vcRecaptchaService.reload(false);
            }
            );
        } else {
            $scope.error = $rootScope.i18n.auth.password_weak;
        }
    };

    $scope.cancel = function(){
        if($scope.currentUser){
            usersService.deleteUser('me', function(){}, function(){});
        }
        $window.location = "/ui/logout";
    };

    $scope.terms = "termsOfService";

    $scope.changeTerms = function(value){
        $scope.terms = value;
    };

    $scope.termsAndConditions = function(){
        $('#termsAndConditionModal').appendTo("body").modal('show');
    };
});

iotController.controller('LogoutCtrl', function ($window, loginService, sessionService) {
    sessionService.clearJwt();
    $window.location = '/';
});
