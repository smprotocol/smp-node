"use strict";
//
// SMP, Benchmark, sub.
//
// Version: 0.0.1
// Author: Mark W. B. Ashcroft (mark [at] fluidecho [dot] com)
// License: MIT or Apache 2.0.
//
// Copyright (c) 2015 Mark W. B. Ashcroft.
// Copyright (c) 2015 FluidEcho.
//


var preview = require('preview')('socket_sub');
var humanize = require('humanize-number');
var argv = require('minimist')(process.argv.slice(2));
//var nws = require('naked-websocket');
var net = require('net');
var babar = require('babar');
var colors = require('colors');
//var fs = require('fs');
var smp = require('..');
var stream = smp.StreamParser;


var parser = new stream();

var options = {
	//protocol: 'ws',					// or 'wss' for secure.
	//key: fs.readFileSync(__dirname + '/keys/key.pem'),
  //cert: fs.readFileSync(__dirname + '/keys/cert.pem'),
  //rejectUnauthorized: false,
	//requestCert: true,
	//hostname: '127.0.0.1',
  port: 8888,
	//path: '/foo/bar/',
	//codec: 'smp'			// headers.content-type.application
};

if ( argv.transport ) {
	console.log('use socket transport: ' + argv.transport);
	options.transport = argv.transport
}

console.log('my pid: ' + process.pid);

var n = 0;
var ops = 10000;
var bytes = 201;
var prev = 0;
var start = 0;
var results = [];
var graph = [];
var x = 0;
var persec = 0;


var client = net.connect(options, function() {

	preview('client connected');

	//socket.setKeepAlive(true);



 	client.pipe(parser);

	var data = function(message) {
	
		if ( start === 0 ) {
			start = Date.now();
			prev = start;
		}
		if (n++ % ops == 0) {
		  var ms = Date.now() - prev;
		  var sec = ms / 1000;
		  persec = ops / sec | 1;
		  results.push(persec);
		  process.stdout.write('\r  [' + persec + ' ops/s] [' + n + ']');
		  prev = Date.now();
		}   		
	};

	parser.on('message', data);
	parser.on('frame', data);

	parser.on('err', function(err) {
		console.log('err', err);
	});

});


setInterval(function(){
	graph.push([x++, persec]);	
}, 50);  

function done(){
  var ms = Date.now() - start;
  var avg = n / (ms / 1000);
  console.log('\n---------------------------------------------');  
  console.log('| RESULTS ~');
  console.log('---------------------------------------------');
  process.stdout.write('|     median: '); process.stdout.write(humanize(median(results)).bold + ' ops/s\n'.bold);
  console.log('|       mean: %s ops/s', humanize(avg | 0));
  console.log('|      total: %s ops in %ds', humanize(n), ms / 1000);
  console.log('|    through: %d MB/s', ((avg * bytes) / 1000 / 1000).toFixed(2));
  console.log('---------------------------------------------');
  console.log('| OPERATIONS PER SECOND OVER TIME ~');
  console.log('---------------------------------------------');
  console.log(babar(graph, {
		color: 'green',
		yFractions: 0
	}));
  process.exit();
}


function sum(arr) {
  return arr.reduce(function(sum, n){
    return sum + n;
  });
}

function min(arr) {
  return arr.reduce(function(min, n){
    return n < min
      ? n
      : min;
  });
}

function median(arr) {
  arr = arr.sort();
  return arr[arr.length / 2 | 0];
}


process.on('SIGINT', done);
setTimeout(done, ops);
