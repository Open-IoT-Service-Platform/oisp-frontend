var util = require("util")
var config = require("../config")
var requestHelper = require("../helpers/request")

var sendActuation = function(accountId, data, token, callback){
	var url = util.format("%s/accounts/%s/control", config.base_url, accountId);
	requestHelper.makeRequest(requestHelper.makeOptions(url, "POST", data, token), callback);
}

var saveComplexCommand = function(accountId, commandName, data, token, callback){
	var url = util.format("%s/accounts/%s/control/commands/%s", config.base_url, accountId, commandName);
	requestHelper.makeRequest(requestHelper.makeOptions(url, "POST", data, token), callback);
}

var listOfActuations = function(accountId, deviceId, httpParams, data, token, callback){
	var params = requestHelper.serializeHttpParams(httpParams)
	var url = util.format("%s/accounts/%s/control/devices/%s", config.base_url, accountId, deviceId) + params;
	requestHelper.makeRequest(requestHelper.makeOptions(url, "POST", data, token), callback);
}

module.exports = {
    sendActuation: sendActuation,
    saveComplexCommand: saveComplexCommand,
    listOfActuations: listOfActuations
};