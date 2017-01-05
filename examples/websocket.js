"use strict";
//
// SMP, WebSocket
//
// Version: 0.0.1
// Author: Mark W. B. Ashcroft (mark [at] fluidecho [dot] com)
// License: MIT or Apache 2.0.
//
// Copyright (c) 2015-2017 Mark W. B. Ashcroft.
// Copyright (c) 2015-2017 FluidEcho.
//



var nws = require('naked-websocket');
var smp = require('..');
var preview = require('preview')('websocket');


// use same options as: https://nodejs.org/api/tcp.html (or /tls.html)
var options = {
  protocol: 'ws'
};

var server = nws.createServer(options, function(socket) {

  var stream = smp.StreamParser;
  var parser = new stream();

  // can use parser.on( 'frame', 'message', 'err', 'errorMessage', 'information', etc.

  parser.on('frame', function(frame){
    preview('frame', frame);
  });

  socket.pipe(parser);

});

server.listen(8888);


var options = {
  protocol: 'ws',
  hostname: '127.0.0.1',
  port: 8888,
  path: '/foo/bar/'
};

var client = nws.connect(options, function(socket) {

  socket.write(smp.encode([ new Buffer('0123456789'), new Buffer('abcdefghijklmnopqrstuvwxyz'), new Buffer('ABCDEFGHIJKLMNOPQRSTUVWXYZ') ], {max_message_size: 20, id: 555, first: true}).toBuffer());

});
