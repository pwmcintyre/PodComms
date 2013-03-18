var forever = require('forever-monitor');

var child = new (forever.Monitor)('./node_modules/PodComms.js');
console.log("starting with forever");

child.start();

