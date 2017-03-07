var util = require("util")
var config = require("../config")
var requestHelper = require("../helpers/request")

var getToken = function(username, password, callback){
  var url = util.format("%s/auth/token", config.base_url);
  var data = {
    "username": username,
    "password": password
  };
  requestHelper.makeRequest(requestHelper.makeOptions(url, "POST", data), callback);
}

module.exports = {
    getToken: getToken
};