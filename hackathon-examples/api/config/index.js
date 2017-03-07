var fs = require("fs")
var path = require("path")
var util = require("util")

var config =  JSON.parse(fs.readFileSync(path.resolve(__dirname, "./default.json")).toString())

/* override for local development if NODE_ENV is defined to local */
if (process.env.NODE_ENV && (process.env.NODE_ENV.toLowerCase().indexOf("local") !== -1)) {
	config.host = "localhost"
	config.protocol = "http"
}

config.base_url = util.format("%s://%s%s", config.protocol, config.host, config.api_root);

module.exports = config;