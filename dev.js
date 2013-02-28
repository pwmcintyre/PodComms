var forever = require('forever-monitor');

var child = new (forever.Monitor)('node_modules/PodComms.js', {
	max: 3,
	'watch': true,              // Value indicating if we should watch files.
	'watchIgnoreDotFiles': null, // Dot files we should read to ignore ('.foreverignore', etc).
	'watchIgnorePatterns': null, // Ignore patterns to use when watching files.
	'watchDirectory': '.',      // Top-level directory to watch from.
	options: []
});

child.on('exit', function () {
	console.log('PodComms has exited after 3 restarts');
});

child.start();
//forever.startServer(child);
//console.log(forever);