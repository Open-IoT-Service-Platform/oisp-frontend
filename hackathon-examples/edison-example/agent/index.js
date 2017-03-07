var dgram = require('dgram');

var PORT = 41234;
var HOST = '127.0.0.1';

var sendObservation = function(data, cb){
	var message = new Buffer(JSON.stringify(data));
	
	var client = dgram.createSocket('udp4');
	client.send(message, 0, message.length, PORT, HOST, function(err, response){
		cb && cb(err, response);
		client.close();
	});
}

module.exports = {
	sendObservation: sendObservation
};