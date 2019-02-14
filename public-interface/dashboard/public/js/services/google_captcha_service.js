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
iotServices.factory('googleCaptchaService', ['$http', function($http) {

    var REMOTE_JS_URL = '//www.google.com/recaptcha/api/js/recaptcha_ajax.js';
    var API_URL = '/ui/google/captchakey';
    var googleCaptchaPublicKey;

    var googleCaptchaService = {
        loadGoogleCaptcha: function(successCallback, errorCallback){
            var script = document.createElement('script');
            script.onload = successCallback;
            script.onerror = errorCallback;
            script.src = REMOTE_JS_URL;

            document.head.appendChild(script);
        },
        getGoogleCaptchaKey: function(successCallback, errorCallback){
            if(!googleCaptchaPublicKey) {
                $http({
                    method: 'GET',
                    url: API_URL
                })
                    .success(function (data, status) {
                        if(data.captchaPublicKey) {
                            googleCaptchaPublicKey = data.captchaPublicKey;
                        }
                        googleCaptchaService.loadGoogleCaptcha(function(){
                        // Remote Google Captcha now loaded

                            successCallback(data, status);
                        });
                    }).error(function (data, status) {
                        errorCallback(data, status);
                    });
            } else {
                successCallback({
                    captchaPublicKey : googleCaptchaPublicKey
                });
            }
        }
    };

    return googleCaptchaService;
}]);