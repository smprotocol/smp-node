
var net = require('net');
var received = 0;
var start = new Date();

var chunks = 0;
var bytestotal = 0;

var socket = net.connect(8555);

socket.on('data', function(chunk) {
  received += chunk.length;
	chunks++;
	bytestotal += chunk.length;  
});

var interval = setInterval(function() {
  // After 1 gigabyte shutdown.
  if (received > 10 * 1024 * 1024 * 1024) {
    socket.destroy();
    clearInterval(interval);
    process.exit(0);
  } else {
    // Otherwise print some stats.
    var now = new Date();
    var gigabytes = received / (1024 * 1024 * 1024);
    var gigabits = gigabytes * 8.0;
    var millisec = now - start;
    var sec = millisec / 1000;
    console.log((gigabits / sec) + " gbit/sec");
    console.log((gigabytes / sec) + " GB/sec" + ' - chuncks: ' + chunks + ', bytestotal: ' + bytestotal);
  	console.log('---------------------------------------------');    
  }
}, 1000);
