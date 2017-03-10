var express = require('express')
var bodyParser = require('body-parser')
var mqtt = require('mqtt')

var app = express();
app.use( bodyParser.json() );		// to support JSON-encoded bodies
app.use( bodyParser.urlencoded({	// to support URL-encoded bodies
  extended: true
}) );

var extractBroker = function(headers) {
	var broker = {};

	for(var key in headers) {
		if(key.substr(0,4) == "mqtt") {
			broker[key.substr(5)] = headers[key];
		}
	}

	var requiredKeys = ['host', 'topic']
	for (var i = 0; i < requiredKeys.length; i++)
	{
		var value = broker[requiredKeys[i]]
		if(value == null || value == undefined || value.length == 0)
		{
			return null
		}
	}

	return broker;
};

app.get('/', function(req, res) {
	res.send('Hello from mqttp-proxy')
});

app.put('/', function(req, res) {
	var broker = extractBroker(req.headers);
	if(broker != null)
	{
		var body = req.body
		// console.log("value:", body.conditions[0].components[0].valuePoints[0].value);
		console.log(broker);
		// console.log(body)

		// This can be improve by caching connections
		console.log("Connecting...")
		var client  = mqtt.connect('mqtt://' + broker.host)
		client.on('connect', function () {
			client.publish(broker.topic, JSON.stringify(body))
			client.end()
		})
	}
	
	res.send('Done');
});

app.listen(9090, function () {
  console.log('mqttp-proxy listening on port 9090!')
});
