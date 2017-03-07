var mqtt = require('mqtt')
var api = require('../api')

var username = "<username>";
var password = "<password>";

var accountId = "c31d7895-98fe-45a4-a8f8-abaa1dcf129b";
var alertledComponentId = "955bad6b-2128-4f0b-bb98-7ac37391ee9b";

var ready = false;
var apiToken = null;
api.auth.getToken(username, password, function(err, response){
	if(err)
	{
		throw err
	}
	ready = true;
	apiToken = response.token
})

var client  = mqtt.connect('mqtt://test.mosquitto.org')
 
client.on('connect', function () {
	console.log("Connected")
	client.subscribe('somethingInteresting')
})
 
client.on('message', function (topic, message) {
	if(!ready) return;

	var data = JSON.parse(message.toString())
	var value = parseInt(data.conditions[0].components[0].valuePoints[0].value, 10);

	console.log()
	console.log("incoming value: " + value)
	var alertledValue = (value % 2)+""
	
	var data = {
   		"commands": [{
               "componentId": alertledComponentId,
               "parameters": [{
	               "name": "on",
	               "value": alertledValue
               }],
               "transport": "ws"
            }
       ],
       "complexCommands": []
	};
	api.control.sendActuation(accountId, data, apiToken, function(err, res){
		if(!err)
		{
			console.log("Actuation sent")
			console.log("component: " + "alertled")
			console.log("parameter: " + "on")
			console.log("value: " + alertledValue)
		}
	})
})

console.log("Listening...")