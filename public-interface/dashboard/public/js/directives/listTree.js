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
iotApp.directive('treeList', function () {
    return {
        restrict: 'E',
        template: '<div style="display: none"><ul><tree-list-item ng-repeat="item in tree" item="item"></tree-list-item></ul></div>',
        replace: true,
        transclude: true,
        scope: {
            tree: '=',
            eagerInit: "=",
            selectGroup: '&'
        },
        link: function (scope, element) {
            scope.$on('repeat-done', function(){
                angular.element('#hierarchy').menu({
                    content: element.html(),
                    positionOpts: { posX: 'left', posY: 'top' },
                    //maxHeight:100,
                    crumbDefaultText: '',
                    linkHover: 'fg-menu-li-hover',
                    eagerInit: scope.eagerInit || false,
                    chooseItemCallback: scope.selectGroup
                });
            });
        }
    };
});
iotApp.directive('treeListItem', function ($compile, $timeout) {
    return {
        restrict: 'E',
        template: '<li><a href="#" data-id="{{item.id}}">{{item.name}}</a></li>',
        replace: true,
        transclude: true,
        scope: {
            item: "="
        },
        link: function (scope, element) {
            scope.$watch('item.children', function(it) {
                if(it !== undefined && it.length !== undefined && it.length > 0){
                    element.append($compile('<ul><tree-list-item ng-repeat="child in item.children" item="child"></tree-list-item></ul>')(scope));
                }
            });

            if (scope.$parent.$last){ // ISSUE IS HERE
                $timeout(function(){
                    scope.$emit('repeat-done');
                });
            }
        }
    };
});