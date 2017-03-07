#!/usr/bin/env node
var actuation = require("./actuation");
var agent = require("./agent")

actuation.setListener(function(err, actuationEvent){
  if (err) throw err;
  
  var component = actuationEvent['component'];
  var command = actuationEvent['command'];
  var argvArray = actuationEvent['argv'];

  console.log()
  console.log("component: " + component);
  console.log("command: " + command);
  console.log("parametres:")

  argvArray.forEach(function(parameter){
    var name = parameter['name']
    var value = parameter['value']
    console.log("name: " + name);
    console.log("value: " + value);
  });
});

var getRandomInteger = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

setInterval(function(){
  var telemetry = {"n":"temp", "v": getRandomInteger(1,100)};

  agent.sendObservation(telemetry, function(err, bytes) {
    if (err) throw err;
    console.log()
    console.log(telemetry)
    console.log('UDP message sent to agent');
  })
}, 10 * 1000)