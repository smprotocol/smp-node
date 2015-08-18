"use strict";
//
// SMP, Benchmark, pub.
//
// Version: 0.0.1
// Author: Mark W. B. Ashcroft (mark [at] fluidecho [dot] com)
// License: MIT or Apache 2.0.
//
// Copyright (c) 2015 Mark W. B. Ashcroft.
// Copyright (c) 2015 FluidEcho.
//


var preview = require('preview')('nws_pub');
var humanize = require('humanize-number');
var argv = require('minimist')(process.argv.slice(2));
var nws = require('naked-websocket');
var mtuc = require('mtuc');
//var fs = require('fs');
var smp = require('..');


// use same options as: https://nodejs.org/api/tcp.html (or /tls.html)
var options = {
	protocol: 'ws',						// or 'wss' for secure.
	slowHandshake: false,				// true: can do your own authorization and handshake or close socket.
	//key: fs.readFileSync(__dirname + '/keys/key.pem'),
  //cert: fs.readFileSync(__dirname + '/keys/cert.pem'),	
  rejectUnauthorized: false,
	requestCert: true,
	noDelay: false								// true: turn Nagle tcp batching off.
};


var size = 201;
var x = 0;
var n = 0;
var prev = 0;
var start = 0;


// exit handling.
process.stdin.resume();

function exitHandler(options, err) {
  if (options.cleanup) {
  	console.log('---------------------------------------------');
		console.log('sub closed, exit, ops sent: ' + humanize(x));
		console.log('---------------------------------------------');
	}
  if (err) console.log(err.stack);
  if (options.exit) process.exit();
}

process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));


// message sending.
var buf = new Buffer(Array(size).join('a'));
console.log('sending %d byte messages', buf.length);
console.log('my pid: ' + process.pid);


var server = nws.createServer(options, function(socket) {

	preview('client connected');

	var mtucontoller = new mtuc({mtu: 8985, noDelay: false}, socket);

	socket.setKeepAlive(true);

	socket.on('close', function() {
		console.log('---------------------------------------------');
		console.log('sub closed, exit, ops sent: ' + humanize(x));
		console.log('---------------------------------------------');
		process.exit();
	});

	socket.on('drain', function() {
  	socket.resume();
	});			
	
	function more() {

			if ( socket.writable && socket.handshaked ) {
		
					if ( !socket.isPaused() ) {

						var msgArray = smp.encode([ buf ], {max_message_size: 8999});
						if ( !msgArray ) {
							console.log('msgArray error, ran out of ids');
							process.exit(0);
						}

						for ( var t = 0; t < 10; t++ ) {		// sending 10 per ticks.
						
							x += msgArray.frames.length;
							var overflow = mtucontoller.send(msgArray.frames[0]);

						}
						if ( !overflow ) {

							socket.pause();
						}
						
					}	

			}
			setImmediate(more);

	}

	more();
	
});


server.listen(8888, function() { //'listening' listener
  preview('server bound');
});

server.on('error', function(err) {
	preview('server.on.error', err);
	process.exit();
});	

