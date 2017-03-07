var dgram = require("dgram");

var PORT = 41235;
var HOST = '127.0.0.1';

var setListener = function(cb){
  // listen for UDP message from local iotkit agent
  var server = dgram.createSocket("udp4");

  server.on("error", function (err) {
    console.error("server error:\n" + err.stack);
    server.close();
  });

  server.on("message", function (msg, rinfo) {
    // Ignore essages unless they are local
    if(rinfo.address != HOST) {
      return console.error("Ignoring remote UDP message");
    }

    var actuationEvent = null
    try {
      actuationEvent = JSON.parse(msg);
    }
    catch(e){}

    if(cb)
    {
      if(actuationEvent == null)
      {
        cb(new Error("Failed to parse actuation event"))
      }
      else
      {
        cb(null, actuationEvent)
      }
    }
  });

  server.on("listening", function () {
    var address = server.address();
    // console.log("server listening " + address.address + ":" + address.port);
  });

  server.bind(PORT);
}

module.exports = {
  setListener: setListener
};