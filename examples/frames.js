"use strict";
//
// SMP, Frames
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


var framed = smp.encode([ new Buffer("0123456789"), new Buffer("abcdefghijklmnopqrstuvwxyz") ], {max_message_size: 10});
preview('framed', framed);

var message = smp.decode(framed.frames);
preview('message', message);
