"use strict";
//
// SMP, streaming
//
// Version: 0.0.1
// Author: Mark W. B. Ashcroft (mark [at] fluidecho [dot] com)
// License: MIT or Apache 2.0.
//
// Copyright (c) 2015 Mark W. B. Ashcroft.
// Copyright (c) 2015 FluidEcho.
//



var net = require('net');
var smp = require('..');
var preview = require('preview')('streaming');


var server = net.createServer(function(sock){

  var stream = smp.StreamParser;
  var parser = new stream();

  // can use parser.on( 'frame', 'message', 'err', 'errorMessage', 'information', etc.

  parser.on('frame', function(frame){
    preview('frame', frame);  
  });  

  sock.pipe(parser);
  
});

server.listen(8888);


var client = net.connect(8888);

var framed = smp.encode([ new Buffer('0123456789'), new Buffer('abcdefghijklmnopqrstuvwxyz'), new Buffer('ABCDEFGHIJKLMNOPQRSTUVWXYZ') ], {max_message_size: 20, id: 555, first: true});
preview('framed', framed);

client.write(framed.toBuffer());

