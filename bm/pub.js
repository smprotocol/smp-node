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
	noDelay: true								// true: turn Nagle tcp batching off.
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
var mgs = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqr';
//var buf = new Buffer(Array(size).join('a'));
var buf = new Buffer(mgs);
console.log('sending %d byte messages', buf.length);
console.log('my pid: ' + process.pid);

var blob = new Buffer(65536 - 20 - 20);		// 65529
//var blobbuf = new Buffer(0);
var blobarr = [];
var bloblen = 0;
var overflow = false;


//var testamp = smp.encode([ new Buffer('abcdefghijklmnopqrstuvwxyz') ], {max_message_size: 77536});
//console.log('testamp', testamp);




// batch up smp events to make mss full when write to tcp.
var batchedbufsArray = [];
var batchedbufsSize = 0;
for ( var b = 0; b < 316; b++ ) {		// 316
	var msgArray = smp.encode([ buf ], {max_message_size: 77536});
	batchedbufsSize += msgArray.frames[0].length;
	batchedbufsArray.push(msgArray.frames[0]);
}
//console.log('batchedbufsSize', batchedbufsSize);
var batchedbufs = new Buffer(batchedbufsSize);
batchedbufs = Buffer.concat(batchedbufsArray, batchedbufsSize); 
console.log('batchedbufs', batchedbufs.length);			

/*
var fs = require('fs');
fs.writeFile(__dirname + "/dump", batchedbufs, function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
}); 
*/

var server = nws.createServer(options, function(socket) {

	preview('client connected');

	//var mtucontoller = new mtuc({mtu: 65536 - 20 - 20, noDelay: false}, socket);

	socket.setKeepAlive(true);

	socket.on('close', function() {
		console.log('---------------------------------------------');
		console.log('sub closed, exit, ops sent: ' + humanize(x));
		console.log('---------------------------------------------');
		process.exit();
	});

	socket.on('drain', function() {
		//console.log('drain');
		overflow = false;
  	socket.resume();
	});			
	

	
	function more() {

		//console.log('more...');

			if ( socket.writable && socket.handshaked ) {
	
					if ( !socket.isPaused() ) {

						//var msgArray = smp.encode([ buf ], {max_message_size: 77536});
						//var msgArray = smp.encode([ buf ], {max_message_size: 77536});
						//if ( !msgArray ) {
						//	console.log('msgArray error, ran out of ids');
						//	process.exit(0);
						//}

						for ( var t = 0; t < 15; t++ ) {		// sending t per tick.
						
							//x += msgArray.frames.length;

							//var overflow = mtucontoller.send(msgArray.frames[0]);
							
							
							//var eventbuf = msgArray.frames[0];
							//console.log('eventbuf', eventbuf);
							
							//var msgArray = smp.encode([ new Buffer('12345') ], {max_message_size: 77536});
							//console.log(msgArray.frames[0]);
	
							//var msgArray2 = smp.encode([ new Buffer('XYZ') ], {max_message_size: 77536});							
							//var multieventBlobs = Buffer.concat([msgArray.frames[0], msgArray2.frames[0]], msgArray.frames[0].length + msgArray2.frames[0].length);

							//var overflow = socket.write(msgArray.frames[0]);

							//var overflow = mtucontoller.send(batchedbufs);
							//var overflow = socket.write(multieventBlobs);
							
							
							
							//var msgArray = smp.encode([ buf ], {max_message_size: 77536});
							//overflow = socket.write(batchedbufs);

							
							var msgArray = smp.encode([ buf ], {max_message_size: 77536});
							blobarr.push(msgArray.frames[0]);
							bloblen += msgArray.frames[0].length;
							if ( bloblen > 65436 - 20 - 20 ) {
								var bufwrite = Buffer.concat(blobarr, bloblen);
								overflow = socket.write( bufwrite );
								//console.log('write and reset, overflow', overflow);
								bloblen = 0;
								blobarr = [];
							}
							
							
							//var overflow = socket.write(blob);

						}
						
						if ( overflow ) {
							//console.log('pause');
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

