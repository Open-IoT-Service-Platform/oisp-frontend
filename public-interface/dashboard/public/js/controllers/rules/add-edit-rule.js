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

iotController.controller('AddEditRuleCtrl', function($scope,
    $routeParams,
    rulesService,
    Rule,
    Filter,
    Error,
    Catalog,
    $location,
    utilityService,
    usersService,
    devicesService,
    componentsService,
    sessionService,
    WizardHandler,
    flash,
    controlService
) {

    var i18n = $scope.$parent.i18n;

    $scope.customComponents = true;

    $scope.$parent.page = {
        menuSelected: "rules",
        title: i18n.rules.title
    };
    $scope.ruleId = $routeParams.ruleId;
    $scope.rule = new Rule();

    $scope.catalog = new Catalog();
    $scope.ruleReady = ( $routeParams.ruleId ) ? false : true;
    $scope.enableApplyForAll = true;

    $scope.clearFields = function () {
        for (var i = 0; i < $scope.rule.actions.length; i++) {
            $scope.rule.actions[0].target = [];
            $scope.rule.actions[0].http_headers = {};
        }
    };

    $scope.$watch(sessionService.getCurrentAccount, function(data) {
        if (data) {
            devicesService.getTags(function (data) {
                $scope.tags = data;
            }, function (data) {
                $scope.error = data.message || data;
                $scope.tags = [];
            });
            componentsService.getFullCatalog(function(data){
                $scope.catalogComponents = data;
            }, function(){
                $scope.catalogComponents = [];
            });

            if($scope.currentUser.accounts[$scope.currentAccount.id] &&
                $scope.currentUser.accounts[$scope.currentAccount.id].role === 'admin') {
                usersService.getUsers();
            } else {
                usersService.getUser($scope.currentUser.id, function(data){
                    usersService.data.userList = [ data ];
                }, function(data) {
                    $scope.error = data.message || data;
                });
            }

            controlService.getComplexCommands(function (data) {
                $scope.actuationsList = data;
            }, function () {
                $scope.actuationsList = [];
            });

            if ($scope.ruleId) {
                $scope.rule.getById($scope.ruleId);
            }
        }
    });

    $scope.$watch('rule.externalId', function () {
        $scope.notifications.actuationNotifications = [];
        $scope.notifications.emailNotifications = [];
        $scope.notifications.httpNotifications = [];
        $scope.notifications.httpVisibility = [];
        $scope.notifications.actuationVisibility = [];
        for (var i = 0; i < $scope.rule.actions.length; i++) {
            if ($scope.rule.actions[i].type === 'mail') {
                $scope.notifications.emailNotifications.push($scope.rule.actions[i]);
            } else if ($scope.rule.actions[i].type === 'http') {
                $scope.notifications.httpNotifications.push($scope.rule.actions[i]);
                $scope.notifications.httpVisibility.push(true);
            } else if ($scope.rule.actions[i].type === 'actuation') {
                $scope.notifications.actuationNotifications.push($scope.rule.actions[i]);
                $scope.notifications.actuationVisibility.push(true);
            }
        }
    });

    $scope.queryTags = function(){
        return $scope.tags;
    };
    $scope.wizard = {
        name : "addEditRules"
    };
    $scope.priorityLevel = utilityService.convertToNgOption(i18n.rules.priority_level);
    $scope.notificationTypes = utilityService.convertToNgOption(i18n.rules.notification_types);
    $scope.resetType =  utilityService.convertToNgOption(i18n.rules.reset_option);
    $scope.conditionType = utilityService.convertToNgOption(i18n.rules.condition.type);
    $scope.conditionTypeWithoutAutomatic = utilityService.convertToNgOption(i18n.rules.condition.type);
    $scope.conditionPeriod =  utilityService.convertToNgOption(i18n.time_period);
    $scope.conditionStatic = utilityService.convertToNgOption(i18n.rules.condition.std);
    $scope.conditionOperator = utilityService.convertToNgOption(i18n.rules.condition.satisfied);
    $scope.ruleTypes = utilityService.convertToNgOption(i18n.rules.rule_type);
    $scope.userData = usersService.data;
    $scope.ruleData = rulesService.data;
    $scope.userList = [];
    $scope.userListFilter = [];
    $scope.stillUserList = false;
    $scope.ifDoubleCondition = false;
    $scope.ifTimeBaseCondition = false;
    $scope.emailSelected = null;
    $scope.actuationSelected = null;
    $scope.catalogComponents = [];
    $scope.actuationsList = [];
    $scope.actuationsListFiltered = [];
    $scope.actuationsSelectedList = [];

    $scope.population = {
        devices : []
    };
    $scope.showAddCondition = true;

    $scope.Errors = new Error(i18n);
    function errorHandler (errData) {
        var errMsg;

        if (errData.code === i18n.api_errors.Rule.InvalidData.code) {
            if (errData.errors) {
                //show only first validation error
                errMsg = $scope.Errors.getMessageByCode(errData.errors.pop());
            }
        } else {
            errMsg = $scope.Errors.getMessageByCode(errData.code);

        }

        if(!errMsg) {
            //set default error message
            errMsg = i18n.api_errors.Generic.AnalyticsError.message;
        }

        flash.to('alert-1').error = errMsg;
    }

    $scope.rule.setErrorCallback(errorHandler);

    function Secuence(withoutAutomatic) {
        this.component = null;
        this.type = null;
        this.conditionType = withoutAutomatic || $scope.conditionType;
        this.operator = null;
        this.values = [];
        this.multiple = {
            operator: [],
            values:[]
        };
        this.timeLimit = null;
        this.period = null;
        this.baselineMinimalInstances = null;
        this.baselineCalculationLevel = "Device level";
        this.baselineSecondsBack = null;
        this.conditionOperator = null;
        this.ifDoubleCondition = false;
    }

    $scope.notifications = {
        type: null,
        actuationNotifications: [],
        emailNotifications: [],
        httpNotifications: [],
        httpVisibility: [],
        actuationVisibility: []
    };

    $scope.addNewItem = function (type) {
        $scope.notifications.type = null;
        if (($scope.notifications.emailNotifications.length +
            $scope.notifications.httpNotifications.length +
            $scope.notifications.actuationNotifications.length) >= 5) {
            flash.to('alert-1').error = $scope.i18n.rules.notification_limit_exceeded;
            return;
        }
        switch (type) {
        case 'mail':
            if ($scope.notifications.emailNotifications.length === 0) {
                $scope.notifications.emailNotifications.push({
                    "type": 'mail',
                    "target": []
                });
            }
            break;
        case 'http':
            $scope.notifications.httpNotifications.push({
                "type": 'http',
                "target": [],
                "http_headers": {}
            });
            $scope.notifications.httpVisibility.push(true);
            break;
        case 'actuation':
            if ($scope.actuationsListFiltered.length > 0) {
                $scope.notifications.actuationNotifications.push({
                    "type": 'actuation',
                    "target": []
                });
                $scope.notifications.actuationVisibility.push(true);
            } else {
                flash.to('alert-1').error = $scope.i18n.rules.no_actuations_defined;
            }
            break;
        }
    };

    function filterMailSelected  () {
        $scope.userListFilter = $scope.userList.filter (function (obje) {
            return !($scope.rule.isMailAtAction(obje.email));
        });
    }

    function isActuationInUse(actuation) {
        for (var i = 0; i < $scope.notifications.actuationNotifications.length; i++) {
            if ($scope.notifications.actuationNotifications[i].target[0] === actuation.id) {
                return true;
            }
        }
        return false;
    }

    function filterActuationsSelected() {
        $scope.actuationsListFiltered = $scope.actuationsList.filter(function (actuation) {
            return !isActuationInUse(actuation);
        });
    }

    function getObjectKey (key, list, prop) {
        var a, l = list.length;
        for (var i=0; i < l;++i){
            var o =list[i];
            if (o[prop] === key) {
                a = o;
                break;
            }
        }
        return a;
    }

    function getComponentDefinition(type) {
        var ret = null;
        for (var i = 0; i < $scope.catalogComponents.length; i++) {
            if ($scope.catalogComponents[i].id === type) {
                ret = $scope.catalogComponents[i];
                break;
            }
        }

        return ret;
    }

    $scope.removeEmailNotification = function () {
        var emailNotificationsLength = $scope.notifications.emailNotifications[0].target.length;
        for(var i = 0; i < emailNotificationsLength; i++) {
            $scope.removeEmailFromNotification($scope.notifications.emailNotifications[0].target.length-1);
        }
        $scope.notifications.emailNotifications.splice(0, 1);
        filterMailSelected();
    };

    $scope.removeHttpNotification = function (index) {
        $scope.notifications.httpNotifications.splice(index, 1);
    };

    $scope.removeActuationNotification = function (index) {
        $scope.notifications.actuationNotifications.splice(index, 1);
        filterActuationsSelected();
    };

    $scope.$watch('notifications', function () {
        $scope.rule.actions = [];

        $scope.notifications.emailNotifications.forEach(function (emailNotification) {
            $scope.rule.actions.push(emailNotification);
        });
        filterMailSelected();

        $scope.notifications.httpNotifications.forEach(function (httpNotification) {
            $scope.rule.actions.push(httpNotification);
        });

        $scope.notifications.actuationNotifications.forEach(function (actuationNotification) {
            $scope.rule.actions.push(actuationNotification);
        });
    }, true);

    $scope.chosen = {
        prioritiy: null,
        resetType: null,
        type: null,
        condition: null,
        chosen: null,
        applyForAll: false,
        period: null,
        devices: null,
        conditionSequence: [new Secuence()]
    };
    var applySurrogate = $scope.chosen.applyForAll;
    $scope.condition = {
        operator: null,
        value: null,
        valueRight: null,
        ruleCondition: null,
        forLast: null,
        ruleComponent: null,
        stdInstances: 10 //Default 10
    };
    $scope.components = [];
    $scope.searchResult = {
        "metrics": [],
        "devices": []
    };
    $scope.filters = new Filter();
    $scope.doing = $routeParams.operation;

    var keepSelectedConditionFromCollection = function(collection) {
        var conditionChosen = $scope.chosen.conditionSequence[0].type;
        if (conditionChosen) {
            $scope.chosen.conditionSequence[0].conditionType = collection;
            var i,
                l = $scope.chosen.conditionSequence[0].conditionType.length;
            for (i = 0; i < l; i++) {
                if ($scope.chosen.conditionSequence[0].conditionType[i].key === conditionChosen.key) {
                    $scope.chosen.conditionSequence[0].type = $scope.chosen.conditionSequence[0].conditionType[i];
                    break;
                }
            }
        }
    };

    $scope.addSequenceToRule = function () {
        if($scope.chosen.conditionOperator === null) {
            return;
        }
        $scope.chosen.conditionSequence.push(new Secuence($scope.conditionTypeWithoutAutomatic));
        $scope.chosen.conditionSelected = true;
        keepSelectedConditionFromCollection($scope.conditionTypeWithoutAutomatic);
    };
    $scope.removeSecuenceFromRule = function () {
        $scope.chosen.conditionSequence.splice(-1, 1);
        $scope.chosen.conditionSelected = ($scope.chosen.conditionSequence.length > 1);
        keepSelectedConditionFromCollection($scope.conditionType);
    };

    $scope.setUpConditionTypes = function(){
        var i = 0,
            l = $scope.chosen.conditionSequence.length,
            type = null;

        for(; i < l; i++){
            type = $scope.chosen.conditionSequence[i].type;
            if ($scope.rule.resetType === 'Automatic' || $scope.rule.getConditionsLength() > 1) {
                $scope.chosen.conditionSequence[i].conditionType = $scope.conditionTypeWithoutAutomatic;
            } else {
                $scope.chosen.conditionSequence[i].conditionType = $scope.conditionType;
            }
            $scope.chosen.conditionSequence[i].type.key = type.key;
        }
        $scope.componentsSelectable = true;
    };

    function getConditionOperatorData (value) {
        if (value) {
            if (value === "basic" || value === "time") {
                return utilityService.convertToNgOption(i18n.rules.condition["btc"]);
            } else if (value === "statistics") {
                return utilityService.convertToNgOption(i18n.rules.condition["sbc"]);
            }
        }
    }

    $scope.componentsSelectable = true;

    $scope.firedSelectType = function (id) {
        var value = $scope.chosen.conditionSequence[id].type.key;
        $scope.chosen.conditionSequence[id].conditionOperator = getConditionOperatorData(value);

        if ($scope.chosen.conditionSequence[id].catalog && $scope.chosen.conditionSequence[id].catalog.dataType !== 'Number') {
            $scope.chosen.conditionSequence[id].conditionOperator = utilityService.convertToNgOption(i18n.rules.condition["operatorNotNumber"]);
        }

        $scope.componentsSelectable = true;

    };

    $scope.firedSelectedComponent = function(id, currentRule) {
        var cID = $scope.chosen.conditionSequence[id].component.type;
        $scope.chosen.conditionSequence[id].catalog = new Catalog();
        $scope.chosen.conditionSequence[id].catalog.setData(getComponentDefinition(cID));
        if ($scope.chosen.conditionSequence[id].catalog.dataType !== 'Number') {
            $scope.chosen.conditionSequence[id].conditionType = utilityService.convertToNgOption(i18n.rules.condition.typeNotNumber);
            if (currentRule) {
                $scope.chosen.conditionSequence[id].type = getObjectKey(currentRule.type, $scope.chosen.conditionSequence[id].conditionType, 'key');
            }
        } else if ($scope.chosen.conditionSequence[id].catalog.dataType === 'Number') {
            $scope.chosen.conditionSequence[id].conditionType = utilityService.convertToNgOption(i18n.rules.condition.type);
            if (id > 0 || $scope.chosen.conditionSequence.length > 1 || $scope.rule.resetType === 'Automatic') {
                $scope.chosen.conditionSequence[id].conditionType = $scope.conditionTypeWithoutAutomatic;
            }
            if (currentRule) {
                $scope.chosen.conditionSequence[id].type = getObjectKey(currentRule.type, $scope.chosen.conditionSequence[id].conditionType, 'key');
            }
        }
    };
    $scope.addMultipleFromCondition = function (id) {
        $scope.chosen.conditionSequence[id].multiple.values.push("");
    };
    $scope.removeMultipleFromCondition = function (id, i) {
        i.operator.splice(id, 1);
        i.values.splice(id, 1);
    };

    $scope.setConditionInputType = function (id) {
        var type = $scope.chosen.conditionSequence[id].operator.key;
        $scope.chosen.conditionSequence[id].ifDoubleCondition = ((type) &&  ((type === "bt") || (type === "nbt")));
        var condType = $scope.chosen.conditionSequence[id].type.key;
        $scope.chosen.conditionSequence[id].multiple.allow = ((type) && (type === "eq" || type === "ne") && (condType === "basic" || condType === "time"));

        var values = $scope.chosen.conditionSequence[id].multiple.values;
        if (values && values.length > 0) {
            $scope.chosen.conditionSequence[id].multiple.values = [];
        }
    };

    $scope.$watch('userListFilter', function () {
        $scope.stillUserList = $scope.userListFilter.length > 0;
    }, true);
    /**
     * IT watch for UserList changes, this will display or
     * not the e-mail notification chooser.
     */
    $scope.$watch('userData.userList', function (val) {
        if (val){
            var da = [];
            for (var i = 0; i < val.length; i++ ) {
                var item = val[i];
                da.push({id: item.id, email: item.email});
                $scope.userList = da;
            }
        }
    }, true);

    $scope.$watch('actuationsList', function (list) {
        if (list) {
            var formatList = [];
            list.forEach(function (item) {
                formatList.push({id: item.id});
            });
            $scope.actuationsList = formatList;
        }
    }, true);

    function prepareCondition () {
        var l = $scope.chosen.conditionSequence.length;
        var values = [];
        var type = "Regular";
        for (var i = 0; i < l ; ++i) {
            var ob = $scope.chosen.conditionSequence[i];
            var da = {
                type: ob.type.key,
                values: ob.values
            };

            da.component = {
                dataType: ob.catalog.dataType,
                name: ob.component.name,
                cid: ob.component.cid
            };

            da.values = da.values.concat(ob.multiple.values);
            if (!ob.operator) {
                ob.operator = $scope.firedSelectSensitivity(i);
            }
            da.operator =  ob.operator.text;

            if (da.type === "statistics") {
                da.baselineMinimalInstances = ob.baselineMinimalInstances;
                da.baselineCalculationLevel = "Device level";
                da.baselineSecondsBack = utilityService.getPeriodToSeconds(ob.period.key, ob.baselineSecondsBack);
                if ((ob.operator.key === 'lt')|| (ob.operator.key === 'ltoeq')) {
                    da.values[0] = (-da.values[0]).toString();
                } else if ((ob.operator.key === 'bt')|| (ob.operator.key === 'nbt')) {
                    da.values[1] = (da.values[0]).toString();
                    da.values[0] = (-da.values[0]).toString();
                }
            }
            da.operator =  ob.operator.text;
            if (da.type === "time") {
                da.timeLimit = utilityService.getPeriodToSeconds(ob.period.key, ob.timeLimit);
            }

            values.push(da);
        }
        if (!$scope.chosen.conditionOperator) {
            $scope.chosen.conditionOperator = { key: 'OR'};
        }
        var conditions = {
            operator: $scope.chosen.conditionOperator.key,
            values : values
        };
        $scope.rule.setCondition(conditions);
        $scope.rule.setType(type);
    }

    var buildComponentFormattedName = function(name, dataType, deviceId){
        return deviceId + ': ' + name + ' (' + dataType + ') ';
    };

    function prepareDevices () {
        $scope.population.devices =  $scope.filters.getDevicesId();
        var tags = $scope.filters.getTags();
        if (tags !== undefined && tags.length > 0) {
            $scope.population.tags = tags;
        }
        $scope.population.deviceName = $scope.filters.getName();
        $scope.components.length = 0;
        /**
         * it will iterate among all devices to get the Components.
         */
        Object.keys($scope.searchResult.devices).forEach(function(index){
            var device = $scope.searchResult.devices[index];
            if($scope.filters.isDidChoose(device.deviceId) && device.components) {
                device.components.forEach(function(c){
                    var catalog = getComponentDefinition(c.type);
                    c.formattedName = buildComponentFormattedName(c.name, catalog.dataType, device.deviceId);
                    $scope.components.push(c);

                });
            }
        });
        $scope.rule.setPopulation($scope.population);
    }

    $scope.$watch('userList', function() {
        filterMailSelected();
    }, true);

    $scope.$watch('actuationsList', function () {
        filterActuationsSelected();
    }, true);

    $scope.actuationSelectToNotificate = function (data, index) {
        document.getElementById("idActuationChosen" + index).selectedIndex = 0;

        if (data) {
            $scope.notifications.actuationNotifications[index].target.push(data.id);
            filterActuationsSelected();
        }
    };

    function setDetailsOption () {
        filterMailSelected();
        $scope.chosen.priority = utilityService.getNgOptionFromAAkey($scope.rule.priority,
            $scope.priorityLevel);
        $scope.chosen.resetType = utilityService.getNgOptionFromAAkey($scope.rule.resetType,
            $scope.resetType);
    }
    function setFiltersOption() {
        var s = $scope.rule.getPopulation();
        $scope.filters.setTags(s.tags);
        $scope.filters.setName(s.name);
        if (s.ids) {
            $scope.filters.setDeviceId(s.ids);
        } else {
            $scope.chosen.applyForAll = true;
            applySurrogate = $scope.chosen.applyForAll;
        }
    }

    function addSecuences( l ){
        var li = $scope.chosen.conditionSequence.length;
        for (li; li < l; ++li ) {
            $scope.addSequenceToRule();
        }

    }

    function setNegative(val){
        return -val;
    }



    function setCondtionOption() {
        var obj = $scope.rule.getCondition();



        $scope.chosen.conditionOperator = getObjectKey(obj.operator,
            $scope.conditionOperator, 'key');
        var length = obj.values.length;
        addSecuences(length);

        for (var i = 0; i < length ; ++i) {
            var o = obj.values[i];
            $scope.chosen.conditionSequence[i].component = getObjectKey(o.component.cid, $scope.components, 'cid');
            $scope.chosen.conditionSequence[i].catalog = new Catalog();
            if($scope.chosen.conditionSequence[i].component) {
                $scope.chosen.conditionSequence[i].catalog.setData(getComponentDefinition($scope.chosen.conditionSequence[i].component.type));
            }

            $scope.chosen.conditionSequence[i].type = getObjectKey(o.type, $scope.conditionType, 'key');
            $scope.chosen.conditionSequence[i].values = o.values;

            $scope.firedSelectType(i);

            $scope.chosen.conditionSequence[i].operator = getObjectKey(o.operator, $scope.chosen.conditionSequence[i].conditionOperator, 'text');

            if($scope.chosen.conditionSequence[i].operator != null) {
                if ($scope.chosen.conditionSequence[i].operator.key === 'bt' || $scope.chosen.conditionSequence[i].operator.key === 'nbt') {
                    $scope.chosen.conditionSequence[i].ifDoubleCondition = true;
                }

                if ((o.type === "basic" || o.type === "time") &&
                    ($scope.chosen.conditionSequence[i].operator.text === 'Equal' ||
                    $scope.chosen.conditionSequence[i].operator.text === 'Not Equal')) {
                    $scope.chosen.conditionSequence[i].multiple.values = $scope.chosen.conditionSequence[i].values.splice(1);
                    $scope.chosen.conditionSequence[i].multiple.allow = true;
                }
            }

            if (o.type === "statistics") {
                if (o.values[0] < 0) {
                    $scope.chosen.conditionSequence[i].values = o.values.map(setNegative);
                }

                $scope.chosen.conditionSequence[i].baselineMinimalInstances = o.baselineMinimalInstances;
                var bsb = utilityService.converFromSeconds(o.baselineSecondsBack);
                $scope.chosen.conditionSequence[i].baselineSecondsBack = bsb.value;
                $scope.chosen.conditionSequence[i].period = getObjectKey(bsb.key,
                    $scope.conditionPeriod,
                    'key');
            }

            if (o.timeLimit) {
                var r = utilityService.converFromSeconds(o.timeLimit);
                $scope.chosen.conditionSequence[i].timeLimit = r.value;
                $scope.chosen.conditionSequence[i].period = getObjectKey(r.key,
                    $scope.conditionPeriod,
                    'key');
            }

            if($scope.chosen.conditionSequence[i].component) {
                $scope.firedSelectedComponent(i, o);
            }
        }
    }

    $scope.firedSelectSensitivity = function (id) {
        $scope.chosen.conditionSequence[id].operator = getObjectKey('eq', $scope.chosen.conditionSequence[id].conditionOperator, 'key');
    };
    $scope.emailSelectToNotificate = function (data) {
        document.getElementById("idEmailChosen").selectedIndex = 0;
        if($scope.rule.emailSelected !== null) {
            delete $scope.rule.emailSelected;
        }
        if(data) {
            $scope.notifications.emailNotifications[0].target.push(data.email);
            filterMailSelected();
        }
    };
    $scope.removeEmailFromNotification = function(dataIndex) {
        $scope.notifications.emailNotifications[0].target.splice (dataIndex, 1);
        filterMailSelected();
    };
    function persist() {
        if (($scope.doing === 'clone') || $scope.rule.isDraft()) {
            $scope.rule.draft();
        }
    }
    $scope.saveAsDraft = function () {
        $scope.rule.draft();
    };
    $scope.validateDetailRules = function ( ) {
        /**
         * It will save as draft every time we press next
         */
        if (applySurrogate) {
            $scope.chosen.applyForAll = applySurrogate;
            $scope.$broadcast('event:edit-rule-with-no-device-ids', {selected: $scope.chosen.applyForAll});
        }

        persist();
        WizardHandler.wizard($scope.wizard.name).next();
    };
    $scope.validateDevicesRules = function () {
        if($scope.chosen.applyForAll && !$scope.filters.devices.name.value && $scope.filters.devices.tags.value.length === 0) {
            $scope.error = i18n.rules.errors.apiRelated[7401];
        } else {
            prepareDevices();
            persist();
            setCondtionOption();
            if ($scope.components.length > 0) {
                WizardHandler.wizard($scope.wizard.name).next();
            }
        }
    };
    $scope.goBack = function() {
        WizardHandler.wizard($scope.wizard.name).previous();
    };
    $scope.validateConditionRules = function () {
        prepareCondition();
        WizardHandler.wizard($scope.wizard.name).finish();
    };
    $scope.$watch('rule.externalId', function (val) {
        if (val) {
            setDetailsOption();
            setFiltersOption();
            $scope.ruleReady = ($scope.rule.externalId) ? true : false;
        }
    }, true);
    $scope.ifTimeCondition = function (con) {
        return !!((con) && (con === "time"));

    };
    $scope.stillBeingRequire = function () {
        var i,
            l = $scope.rule.actions.length;
        for (i = 0; i < l ; ++i) {
            if ($scope.rule.actions[i].type === 'mail') {
                return ($scope.rule.actions[i].target.length === 0);
            }
        }
        return false;
    };
    $scope.saveRule = function (){
        $scope.rule.saveAs('Active', $scope.chosen.applyForAll, function(){
            $location.path('/rules');
        });
    };

    $scope.show = {
        searchDevice : true,
        selectDevice : true
    };
});
