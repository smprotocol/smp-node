"use strict";
//
// SMP, Message
//
// Version: 0.0.1
// Author: Mark W. B. Ashcroft (mark [at] fluidecho [dot] com)
// License: MIT or Apache 2.0.
//
// Copyright (c) 2015-2017 Mark W. B. Ashcroft.
// Copyright (c) 2015-2017 FluidEcho.
//


var smp = require('..');
var preview = require('preview')('message');


var framed = smp.encode([ new Buffer("0123456789"), new Buffer("abcdefghijklmnopqrstuvwxyz") ]);
preview('framed', framed);

var binmsg = framed.toBuffer();
preview('binmsg', binmsg);

var message = smp.decode(binmsg);
preview('message', message);

console.log('numbers: ' + message.args[0].toString());
console.log('letters: ' + message.args[1].toString());
