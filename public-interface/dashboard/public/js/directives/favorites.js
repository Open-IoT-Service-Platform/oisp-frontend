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

var FavoriteEditModalInstanceCtrl = function($scope,
    $modalInstance,
    $route,
    currentFavorites,
    currentSelection,
    usersService,
    sessionService) {
    $scope.favorite = {
        public: false
    };

    $scope.newName = undefined;
    $scope.updating = true;
    $scope.action = "Update";
    $scope.selectedFavorite = "Select";
    $scope.currentFavorites = currentFavorites;

    $scope.delete = function(){
        if($scope.hasOwnProperty('favorite')) {
            $scope.favorite.public = false;
        }
        $scope.action = "Delete";
        $scope.buttonText = $scope.i18n.favorites.delete;
        $scope.updating = true;
    };

    $scope.rename = function(){
        if($scope.hasOwnProperty('favorite')) {
            $scope.favorite.public = false;
        }
        $scope.action = "Update";
        $scope.buttonText = $scope.i18n.favorites.update;
        $scope.updating = false;
    };

    $scope.submitAction = function(){
        $scope.error = null;
        if ($scope.favorite.id) {
            if ($scope.action === "Update") {
                usersService.updateUserSetting(sessionService.getCurrentAccount().id, 'favorite',
                    $scope.favorite.id, $scope.favorite, function () {
                        $modalInstance.close($scope.favorite);
                    }, function (data) {
                        $scope.error = data;
                    });
            } else if ($scope.action === "Delete") {
                usersService.deleteUserSetting(sessionService.getCurrentAccount().id, 'favorite',
                    $scope.favorite.id, function () {
                        $modalInstance.close($scope.favorite);
                        $route.reload();
                    }, function (data) {
                        $scope.error = data.message;
                    });
            }
        } else {
            $scope.error = $scope.i18n.dashboard.noFavorite_1;
        }
    };

    $scope.select = function(fav){
        $scope.newName = fav.name;
        angular.copy(fav, $scope.favorite);
    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
};

var FavoriteModalInstanceCtrl = function ($scope,
    $modalInstance,
    currentFilters,
    currentFavorites,
    currentSelection,
    usersService,
    sessionService) {
    $scope.favorite = {
        public: false,
        value: currentFilters
    };

    $scope.showCriteria = false;
    $scope.currentFavorites = currentFavorites;
    $scope.updating = true;

    $scope.createNew = function(){
        $scope.favorite.name = undefined;
        $scope.updating = false;
        $scope.buttonText = $scope.i18n.favorites.create;
    };

    $scope.select = function(fav){
        $scope.updating = true;
        angular.copy(fav, $scope.favorite);
        $scope.favorite.value = currentFilters;
        $scope.buttonText = $scope.i18n.favorites.update;
    };

    if(currentSelection){
        $scope.select(currentSelection);
    }

    if(currentFavorites.length===0){
        $scope.favorite.default = true;
        $scope.createNew();
    }

    $scope.add = function () {
        $scope.error = null;
        if($scope.updating){
            usersService.updateUserSetting(sessionService.getCurrentAccount().id, 'favorite',
                $scope.favorite.id, $scope.favorite, function () {
                    $modalInstance.close($scope.favorite);
                }, function (data) {
                    $scope.error = data;
                });
        } else {
            usersService.addUserSettings(sessionService.getCurrentAccount().id, 'favorite',
                $scope.favorite, function () {
                    $modalInstance.close($scope.favorite);
                }, function (data) {
                    $scope.error = data;
                });
        }
    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
};

iotApp.directive('favorites',  ['$modal', 'usersService', 'sessionService', function($modal, usersService, sessionService){

    function link(scope) {
        scope.getFavorites = function() {
            usersService.getUserSettings(sessionService.getCurrentAccount().id, 'favorite',function (data) {
                scope.currentFavorites = data || [];
                data.forEach(function(f){
                    if(f.default){
                        setTimeout(function() {
                            scope.select(f);
                        }, 250);
                        return;
                    }
                });
            }, function () {
                scope.currentFavorites = [];
            });
        };

        scope.$watch(sessionService.getCurrentAccount, function(acc) {
            if (acc) {
                scope.getFavorites();
            } else {
                scope.currentFavorites = [];
            }
        });

        scope.editFavorites = function(){
            var modalInstance = $modal.open({
                templateUrl: 'public/partials/directives/manageFavorites.html',
                controller: FavoriteEditModalInstanceCtrl,
                resolve: {
                    currentFavorites: function () {
                        return scope.currentFavorites;
                    },
                    currentSelection: function(){
                        return scope.currentSelection;
                    }
                }
            });

            modalInstance.result.then(function (fav) {
                scope.currentSelection = fav;
                scope.getFavorites();
            });
            return modalInstance;
        };

        scope.addToFavorites = function(){

            var modalInstance = $modal.open({
                templateUrl: 'public/partials/directives/addToFavorites.html',
                controller: FavoriteModalInstanceCtrl,
                resolve: {
                    currentFilters: function () {
                        return scope.$parent.getFilterWithMetricIDs();
                    },
                    currentFavorites: function () {
                        return scope.currentFavorites;
                    },
                    currentSelection: function(){
                        return scope.currentSelection;
                    }
                }
            });

            modalInstance.result.then(function (fav) {
                scope.currentSelection = fav;
                scope.getFavorites();
            });
            return modalInstance;
        };

        scope.select = function(fav){
            scope.currentSelection = fav;
            if(scope.mode === 'Edit'){
                if(fav.value && scope.$parent.selectFilter) {
                    scope.currentSelection = fav;
                    scope.$parent.selectFilter(fav);
                }
            }
            else{
                if(scope.$parent.filters) {
                    angular.copy(fav.value, scope.$parent.filters);
                }
            }
        };
    }

    return {
        restrict: "E",
        templateUrl: 'public/partials/directives/favorites.html',
        scope : {
            mode: '@mode'
        },
        transclude: true,
        link: link
    };
}]);

