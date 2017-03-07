var util = require("util")
var config = require("../config")
var requestHelper = require("../helpers/request")

var submitData = function(deviceId, accountId, data, token, callback){
	var url = util.format("%s/data/%s", config.base_url, deviceId);
	var observation =  {
		"on": (new Date).getTime(),
		"accountId": accountId,
		"data": data
	}
	requestHelper.makeRequest(requestHelper.makeOptions(url, "POST", observation, token), callback);
}

var retrieveData = function(accountId, data, token, callback){
	var url = util.format("%s/accounts/%s/data/search", config.base_url, accountId);
	requestHelper.makeRequest(requestHelper.makeOptions(url, "POST", data, token), callback);
}

module.exports = {
    submitData: submitData,
    retrieveData: retrieveData
};