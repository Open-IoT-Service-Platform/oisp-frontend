var request = require("request")
var queryString = require("query-string")

var processResponse = function(res, body, callback) {
    var data = null;
    if (res.statusCode === 200 || res.statusCode === 201) {
        if (res.headers['content-type'] &&
            res.headers['content-type'].indexOf('application/json') > -1) {
            data = body;
        } else {
            data = null;
        }
    } else if (res.statusCode === 204) {
        data = { status: "Done" };
    }
    return  callback(data);
}

var makeRequest = function(options, callback){
  request(options, function (error, response, body) {
    if (!error && (response.statusCode === 200 ||
                   response.statusCode === 201 ||
                   response.statusCode === 204)) {
        processResponse(response, body, function(json_data) {
             return callback(null, json_data);
        });
    } else {
        error = error || body;
        return callback(error);
    }
  });
}

var makeOptions = function(url, method, data, token){
  var options = {
    "url": url,
    "proxy": null,
    "method": method,
    "json": true,
    "followAllRedirects": true,
    "strictSSL": false,
    "body": data || {},
    "headers": {}
  }
  if (process.env.PROXY) {
    // logger.debug("Proxy: %s", process.env.PROXY);
    options.proxy = process.env.PROXY;
    options.strictSSL = false;
  }
  if (token) options.headers = { "Authorization": "Bearer " + token };
  return options;
}

var serializeHttpParams = function(httpParams){
  return queryString.stringify(httpParams)
}

module.exports = {
    makeRequest: makeRequest,
    makeOptions: makeOptions,
    serializeHttpParams: serializeHttpParams
};