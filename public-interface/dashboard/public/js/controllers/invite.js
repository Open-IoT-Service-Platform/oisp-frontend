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
iotController.controller('InviteModalCtrl', function ( $scope,
    $rootScope,
    $window,
    $timeout,
    $modalInstance,
    currentAccount,
    users,
    deviceCount,
    invitesService,
    accountsService,
    usersService,
    loginService,
    vcRecaptchaService,
    flash,
    errorUtils,
    googleCaptchaService) {

    $scope.toInvite = {
        email:  null
    };
    $scope.currentAccount = currentAccount;

    $scope.accountInfoMessage = $scope.i18n.account.delete_account_message.replace('%#USERS%', users.length).replace('%#DEVICES%', deviceCount).replace('%#ACCOUNT%', currentAccount.name);

    $scope.recaptcha = {
        key:  '',
        enabled: false
    };

    googleCaptchaService.getGoogleCaptchaKey(function success(data) {
        $scope.recaptcha = {
            key: data.captchaPublicKey,
            enabled: true
        };
    }, function error(){
    });

    $scope.add = function () {
        $scope.error = null;
        var newInvite = {
            email: $scope.toInvite.email
        };

        if($scope.recaptcha.enabled) {
            var captchaData = vcRecaptchaService.data();
            if(!captchaData.response) {
                $scope.error = $rootScope.i18n.auth.captcha_missing;
                return;
            }
            newInvite.challenge = captchaData.challenge;
            newInvite.response = captchaData.response;
        }

        if($scope.currentUser.email !== $scope.toInvite.email) {
            invitesService.addInvite(newInvite, function(){
                $modalInstance.close($scope.toInvite.email);
            }, function(data, status){
                if(status === 409){
                    $scope.error = 'The user is already registered or invited.';
                } else {
                    $scope.error = errorUtils.extractMessageFromServerError(data);
                }
                vcRecaptchaService.reload(false);
            });
        } else {
            $scope.error = 'You cannot invite yourself.';
        }

    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
    $scope.deleteAccount = function() {
        accountsService.deleteAccount($scope.currentAccount.id, function() {
            $modalInstance.close();
            flash.to('alert-1').success = $scope.i18n.account.success_delete;
            $timeout(function(){
                $window.location = '/ui/logout';
            }, 4000);
        }, function(data, status){
            $modalInstance.close();
            flash.to('alert-1').error = $scope.i18n.account.error_delete;
            $scope.error = status;
        });
    };
    $scope.leaveAccount = function() {
        invitesService.delInvite("me", function success(){
            $modalInstance.close();
            flash.to('alert-1').success = $scope.i18n.account.success_leave;
            $timeout(function(){
                $window.location = '/ui/dashboard';
            }, 4000);
        },function error(data, status){
            $modalInstance.close();
            flash.to('alert-1').error = $scope.i18n.account.error_leave;
            $scope.error = status;
        });
    };

});
