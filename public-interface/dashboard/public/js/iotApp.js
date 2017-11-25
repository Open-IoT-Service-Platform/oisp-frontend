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

// Declare app level module which depends on filters, and services
var iotApp = angular.module('iotApp', ['iotDirectives',
                                       'iotServices',
                                       'iotController',
                                       'ngRoute',
                                       'ngI18n',
                                       'ngTable',
                                       'ipCookie',
                                       'snap',
                                       'angularCharts',
                                       'ui.bootstrap',
                                       'bootstrap-tagsinput',
                                       'ngProgress',
                                       'mgo-angular-wizard',
                                       'angular-flash.service',
                                       'angular-flash.flash-alert-directive',
                                       'angular-intro',
                                       'vcRecaptcha'])
    .config(['$routeProvider', '$httpProvider', function($routeProvider, $httpProvider) {
        $routeProvider.when('/board',
            {
                templateUrl: 'public/partials/board.html',
                controller: 'HomeCtrl'
            }
        );
        $routeProvider.when('/devices',
            {
                templateUrl: 'public/partials/devices/devices.html',
                controller: 'ListDevicesCtrl'
            }
        );
        $routeProvider.when('/addDevice',
            {
                templateUrl: 'public/partials/devices/add-edit-device.html',
                controller: 'AddEditDeviceCtrl'
            }
        );
        $routeProvider.when('/editDevice/:deviceId',
            {
                templateUrl: 'public/partials/devices/add-edit-device.html',
                controller: 'AddEditDeviceCtrl'
            }
        );
        $routeProvider.when('/rules',
            {
                templateUrl: 'public/partials/rules/list-rules.html',
                controller: 'ListRulesCtrl'
            }
        );
        $routeProvider.when('/rules/add',
            {
                templateUrl: 'public/partials/rules/add-edit-rule.html',
                controller: 'AddEditRuleCtrl'
            }
        );
        $routeProvider.when('/rules/:operation/:ruleId',
            {
                templateUrl: 'public/partials/rules/add-edit-rule.html',
                controller: 'AddEditRuleCtrl'
            }
        );
        $routeProvider.when('/account',
            {
                templateUrl: 'public/partials/account.html',
                controller: 'AccountCtrl'
            }
        );
        $routeProvider.when('/account/add',
            {
                templateUrl: 'public/partials/account/addAccount.html',
                controller: 'DashboardCtrl'
            }
        );
        $routeProvider.when('/chart',
            {
                templateUrl: 'public/partials/charts/charts.html',
                controller: 'ChartCtrl'
            }
        );
        $routeProvider.when('/alerts',
            {
                templateUrl: 'public/partials/alerts/list-alerts.html',
                controller: 'ListAlertsCtrl'
            }
        );
        $routeProvider.when('/about',
            {
                templateUrl: 'public/partials/about/about.html',
                controller: 'AboutCtrl'
            }
        );
        $routeProvider.when('/alerts/edit/:alertId',
            {
                templateUrl: 'public/partials/alerts/edit-alert.html',
                controller: 'EditAlertCtrl'
            }
        );
        $routeProvider.when('/control',
            {
                templateUrl: 'public/partials/control/control.html',
                controller: 'controlCtrl'
            }
        );
        $routeProvider.when('/profile',
            {
                templateUrl: 'public/partials/auth/profile.html',
                controller: 'profileCtrl'
            }
        );
        $routeProvider.when('/changepassword',
            {
                templateUrl: 'public/partials/auth/changePassword.html',
                controller: 'changePasswordCtrl'
            }
        );
        $routeProvider.when('/termsAndConditions',
            {
                templateUrl: 'public/partials/auth/requireTermsAndConditions.html',
                controller: 'termsAndConditionsCtrl'
            }
        );
        $routeProvider.otherwise(
            {
                redirectTo: '/board'
            }
        );

        $httpProvider.interceptors.push(function($q, $window, sessionService) {
            var startsWith = function(str, prefix) {
                return str.indexOf(prefix) === 0;
            };
            var contains = function(str, needle) {
                return str.indexOf(needle) >= 0;
            };
            return {
                'request': function (request) {
                    request.headers['x-iotkit-requestid'] = 'ui:' + uuid.v4();

                    if(sessionService.getJwt()) {
                        request.headers.Authorization = 'Bearer ' + sessionService.getJwt();
                    }
                    if(sessionService && !startsWith(request.url, '/v1/api/') &&
                        !startsWith(request.url, 'public/') && !startsWith(request.url, '/ui/') &&
                        !contains(request.url, '.html')) {
                        request.url = '/v1/api' + request.url;

                    }
                    if((startsWith(request.url, '/v1/api/') ||
                        startsWith(request.url, '/ui/auth/')) &&
                        getServicesConfig('apiEndpoint')){
                        request.url = getServicesConfig('apiEndpoint') + request.url;
                    }

                    if(document.body && request.url && contains(request.url, '/api/')){
                        document.body.style.cursor = 'wait';
                    }

                    return request;
                },
                'responseError': function(rejection) {
                    if(rejection.status === 401) {
                        window.location = "/ui/logout";
                        return;
                    }

                    if(document.body && rejection.config && rejection.config.url && rejection.config.url.indexOf("/api/") >= 0){
                        document.body.style.cursor = 'default';
                    }

                    return $q.reject(rejection);
                },
                'response': function(response){
                    if(document.body && response.config && response.config.url && response.config.url.indexOf("/api/") >= 0){
                        document.body.style.cursor = 'default';
                    }

                    return response;
                }
            };
        });
    }]);

var iotAppLogin = angular.module('iotAppLogin', ['iotController',
                                                 'iotServices',
                                                 'ngI18n',
                                                 'ngRoute',
                                                 'vcRecaptcha',
                                                 'ipCookie'])
    .config(['$routeProvider', '$httpProvider', function($routeProvider, $httpProvider) {
        $routeProvider.when('/login',
            {
                templateUrl: 'public/partials/auth/login.html',
                controller: 'LoginCtrl'
            }
        );
        $routeProvider.when('/addUser',
            {
                templateUrl: 'public/partials/auth/addUser.html',
                controller: 'LoginCtrl'
            }
        );
        $routeProvider.when('/validate',
            {
                templateUrl: 'public/partials/auth/validate.html',
                controller: 'ValidateUserCtrl'
            }
        );
        $routeProvider.when('/no_validate',
            {
                templateUrl: 'public/partials/auth/noValidate.html',
                controller: 'ValidateUserCtrl'
            }
        );
        $routeProvider.when('/forgotPassword',
            {
                templateUrl: 'public/partials/auth/forgotPassword.html',
                controller: 'ForgotCtrl'
            }
        );
        $routeProvider.when('/reverification',
            {
                templateUrl: 'public/partials/auth/reverification.html',
                controller: 'LoginCtrl'
            }
        );
        $routeProvider.when('/resetPassword',
            {
                templateUrl: 'public/partials/auth/changePassword.html',
                controller: 'ResetPasswordCtrl'
            }
        );
        $routeProvider.when('/activate',
            {
                templateUrl: 'public/partials/auth/activate.html',
                controller: 'ActivateUserCtrl'
            }
        );
        $routeProvider.when('/termsAndConditions',
            {
                templateUrl: 'public/partials/auth/requireTermsAndConditions.html',
                controller: 'termsAndConditionsCtrl'
            }
        );
        $routeProvider.when('/logout',
            {
                template: " ",
                controller: 'LogoutCtrl'
            }
        );
        $routeProvider.when('/login/success',
            {
                template: " ",
                controller: 'LoginCtrl'
            }
        );
        $routeProvider.otherwise(
            {
                redirectTo: '/login'
            }
        );

        $httpProvider.interceptors.push(function($q, $window, sessionService) {
            return {
                'request': function (request) {
                    request.headers['x-iotkit-requestid'] = 'ui:' + uuid.v4();

                    if(sessionService.getJwt()){
                        request.headers.Authorization = 'Bearer ' + sessionService.getJwt();
                    }
                    if(request.url.indexOf('public/') !==0  && request.url.indexOf('/v1/') !== 0 && request.url.indexOf('/ui/') !== 0){
                        request.url = '/v1/api' + request.url;
                    }
                    if((request.url.indexOf('/v1/api/')===0 ||
                        request.url.indexOf('/ui/auth')===0) && getServicesConfig('apiEndpoint')){
                        request.url = getServicesConfig('apiEndpoint') + request.url;
                    }
                    return request;
                }
            };
        });
    }]);

iotAppLogin.value('ngI18nConfig', {
                    defaultLocale: 'en',
                    supportedLocales: ['en'],
                    basePath: 'public/locale',
                    cache: true
   });
iotApp.value('ngI18nConfig', {
    defaultLocale: 'en',
    supportedLocales: ['en'],
    basePath: 'public/locale',
    cache: true
    });

var rawHtmlFilter = ['$sce', function($sce){
    return function(val){
        return $sce.trustAsHtml(val);
    };
}];

iotApp.filter('rawHtml', rawHtmlFilter);
iotAppLogin.filter('rawHtml', rawHtmlFilter);

var iotAppRun = function($rootScope, ngI18nResourceBundle){
    $rootScope.i18n = {};
    ngI18nResourceBundle.get({
        locale: 'en'
    }).success(function (resourceBundle) {
        $rootScope.i18n = resourceBundle;
        $rootScope.i18n.copyright.current_year = (new Date()).getFullYear();
        $rootScope.appReady = true;
    });
};

iotApp.run(iotAppRun);

iotAppLogin.run(iotAppRun);
