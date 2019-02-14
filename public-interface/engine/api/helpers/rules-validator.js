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
var postgresProvider = require('../../../iot-entities/postgresql'),
    Device = postgresProvider.devices;
var errorList = require('../../res/errors');
var conditionTypes = {
    basic: 'basic',
    time: 'time',
    statistics: 'statistics',
    automatic: 'automatic'
};

var validatePopulation = function (rule, errors) {
    // POPULATION
    // at least one child is required
    // TODO: at the moment we require that population.ids are set but the final goal is that at least one child is required.
    if (rule.population.ids === undefined) {
        errors.push(errorList.Errors.Rule.Validation.PopulationItemRequired.code);
    }
};

var validateDevicesHasComponents = function(rule, accountId, cb) {
    // HAS_COMPONENTS
    // Device and Components needs to be there

    Device.getDevices(accountId, {id: {$in: rule.population.ids}}, function(err, devices) {
        //each device should have at least one component
        if(!err){
            devices.forEach(function(device){
                if(device.components.length === 0){
                    cb(errorList.Errors.Rule.Validation.DeviceComponents.NotFound);
                    return false;
                }
            });
            //components from list should be attached to device
            rule.conditions.values.forEach(function(condition){
                var componentFromRule = condition.component.name;
                var componentFound = false;
                devices.forEach(function(device) {
                    device.components.forEach(function (currentDeviceComponent) {
                        if (currentDeviceComponent.name === componentFromRule) {
                            componentFound = true;
                        }
                    });
                });
                if(!componentFound){
                    cb(errorList.Errors.Rule.Validation.DeviceComponents.NotInDevice);
                    return false;
                }
            });
            //there should be no extra devices which components are not used in the rule
            var rule_components_names = rule.conditions.values.map(function(condition) {return condition.component.name;});
            devices.forEach(function(device){
                var device_components_names = device.components.map(function(comp) {return comp.name;});
                var used_components = device_components_names.filter(function(dev_comp) {return rule_components_names.indexOf(dev_comp) >= 0;});
                if (used_components.length === 0) {
                    cb(errorList.Errors.Rule.Validation.DeviceComponents.NotUsed);
                    return false;
                }
            });
            cb(null);
        } else {
            cb(err);
        }

    });
};

var validateConditionsOperator = function (rule, errors) {
    // CONDITIONS OPERATOR
    // Required only if more than one condition is sent.
    if (rule.conditions.values.length > 1 && rule.conditions.operator === undefined) {
        errors.push(errorList.Errors.Rule.Validation.ConditionsOperatorRequired.code);
    }
};

var validateTimeBasedCondition = function (rule, errors) {
    // TIMEBASED CONDITIONS
    // "Equal" and "Not Equal" operators allow unlimited number of values to be defined.
    // We are checking this by the complement, meaning, by controlling how EQUAL works in other type of conditions

    // timeLimit parameter is required
    var timeConditions = rule.conditions.values.filter(function (c) {
        return c.type === conditionTypes.time;
    });
    timeConditions.forEach(function (c) {
        if (c.timeLimit === undefined) {
            errors.push(errorList.Errors.Rule.Validation.TimeLimitRequired.code);
        }
    });
};

var validateStatisticsBasedCondition = function (rule, errors) {
    // STATISTICS BASED CONDITIONS
    // baselineCalculationLevel, baselineSecondsBack, baselineMinimalInstances required

    // All operators except Equal (=), Not Equal (≠) can be used

    // For Statistics-based conditions, the value indicates the number of standard deviation added to the average to create the limit.
    // It is expected that for ">" or ">=" operators a positive value be sent (resulting in AVG+SD upper limit) and
    // for "<" or "<=" a negative value be sent (resulting in AVG-SD lower limit).
    // Similarly, for "Between" and "Not Between" operators, the first value is for the lower limit and should be negative and
    // the second value, for the upper limit, positive.
    var statisticsConditions = rule.conditions.values.filter(function (c) {
        return c.type === conditionTypes.statistics;
    });
    statisticsConditions.forEach(function (c) {
        if (c.baselineCalculationLevel === undefined) {
            errors.push(errorList.Errors.Rule.Validation.Statistics.BaseLineCalculationLevelRequired.code);
        }
        if (c.baselineSecondsBack === undefined) {
            errors.push(errorList.Errors.Rule.Validation.Statistics.BaseLineSecondsBackRequired.code);
        }
        if (c.baselineMinimalInstances === undefined) {
            errors.push(errorList.Errors.Rule.Validation.Statistics.BaseLineMinimalInstancesRequired.code);
        }
        if (c.operator === 'Equal' || c.operator === 'Not Equal') {
            errors.push(errorList.Errors.Rule.Validation.Statistics.EqualityOperatorsNotSupported.code);
        }
        if ((c.operator === '>' || c.operator === '>=') && c.values[0] < 0) {
            errors.push(errorList.Errors.Rule.Validation.Statistics.GtPositiveValueExpected.code);
        }
        if ((c.operator === '<' || c.operator === '<=') && c.values[0] > 0) {
            errors.push(errorList.Errors.Rule.Validation.Statistics.LtNegativeValueExpected.code);
        }
        if ((c.operator === 'Between' || c.operator === 'Not Between') && c.values[0] > 0) {
            errors.push(errorList.Errors.Rule.Validation.Statistics.BetweenNegativeValueExpected.code);
        }
        if ((c.operator === 'Between' || c.operator === 'Not Between') && c.values[1] < 0) {
            errors.push(errorList.Errors.Rule.Validation.Statistics.BetweenPositiveValueExpected.code);
        }
    });
};

var validateAllowedConditionTypesWhichAcceptNonNumericMeasures = function (rule, errors) {
    // Conditions on non-numeric measures may only be of the first two types (Single point or Time dependent).
    var base = rule.conditions.values.filter(function (c) {
        return c.component.dataType !== 'Number';
    });
    base.forEach(function (c) {
        if (c.type !== conditionTypes.basic && c.type !== conditionTypes.time) {
            errors.push(errorList.Errors.Rule.Validation.NonNumericMeasures.InvalidCondition.code);
        }
    });
};

var validateAllowedOperatorsWhichAcceptNonNumericMeasures = function (rule, errors) {
    // A condition on a non-numeric measure can use the Equal (=) and Not Equal (≠) operators described above and also the Like operator
    var base = rule.conditions.values.filter(function (c) {
        return c.component.dataType !== 'Number';
    });
    base.forEach(function (c) {
        if (!(['Equal', 'Not Equal', 'Like'].some(function (o) {
            return o === c.operator;
        }))) {
            errors.push(errorList.Errors.Rule.Validation.NonNumericMeasures.InvalidOperator.code);
        }
    });
};

var validateAllowedOperatorsWhichAcceptNumericMeasures = function (rule, errors) {
    // Possible operators for components with dataType = Number are: ">", "<", "<=", ">=", "Not Equal", "Equal", "Between", "Not Between".
    var base = rule.conditions.values.filter(function (c) {
        return c.component.dataType === 'Number';
    });
    base.forEach(function (c) {
        if (!(['>', '>=', '<', '<=', 'Equal', 'Not Equal', 'Between', 'Not Between'].some(function (o) {
            return o === c.operator;
        }))) {
            errors.push(errorList.Errors.Rule.Validation.NumericMeasures.InvalidOperator.code);
        }
    });
};

var validateOperatorsWhichAcceptMultipleValues = function (rule, errors) {
    // Multiple Values are supported by the "Equal", "Not Equal" and "Like" operators.
    var base = rule.conditions.values.filter(function (c) {
        return !['Equal', 'Not Equal', 'Like', 'Between', 'Not Between'].some(function(operator) {
            return operator === c.operator;
        });
    });
    base.forEach(function (c) {
        if (c.values.length > 1) {
            errors.push(errorList.Errors.Rule.Validation.MultipleValues.InvalidOperator.code);
        }
    });
};

var validateValuesOnBetweenOperator = function (rule, errors) {
    // A condition on a non-numeric measure can use the Equal (=) and Not Equal (≠) operators described above and also the Like operator
    var base = rule.conditions.values.filter(function (c) {
        return c.operator === "Between" || c.operator === "Not Between";
    });
    base.forEach(function (c) {
        if (c.values.length !== 2) {
            errors.push(errorList.Errors.Rule.Validation.BetweenOperators.TwoValuesExpected.code);
        }
    });
};

module.exports = function () {
    var _self = this;

    _self.validateDevicesHasComponents = function(rule, accountId, cb){
        validateDevicesHasComponents(rule, accountId, cb);
    };
    _self.validate = function (rule) {
        var errors = [];
        validatePopulation(rule, errors);
        validateConditionsOperator(rule, errors);

        // BASIC CONDITION
        // "Equal" and "Not Equal" operators allow unlimited number of values to be defined.
        // We are checking this by the complement, meaning, by controlling how EQUAL works in other type of conditions

        validateTimeBasedCondition(rule, errors);
        validateStatisticsBasedCondition(rule, errors);

        validateAllowedConditionTypesWhichAcceptNonNumericMeasures(rule, errors);

        // VALIDATION PER OPERATORS
        validateAllowedOperatorsWhichAcceptNonNumericMeasures(rule, errors);
        validateAllowedOperatorsWhichAcceptNumericMeasures(rule, errors);

        validateOperatorsWhichAcceptMultipleValues(rule, errors);

        // BETWEEN and NOT BETWEEN has to have 2 values top
        validateValuesOnBetweenOperator(rule, errors);

        return errors;
    };
};