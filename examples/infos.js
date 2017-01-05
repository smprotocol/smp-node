"use strict";
//
// SMP, Informational and Action Messages (non MESSAGE/FRAME)
//
// Version: 0.0.1
// Author: Mark W. B. Ashcroft (mark [at] fluidecho [dot] com)
// License: MIT or Apache 2.0.
//
// Copyright (c) 2015-2017 Mark W. B. Ashcroft.
// Copyright (c) 2015-2017 FluidEcho.
//


var smp = require('..');
var preview = require('preview')('infos');


// Information CODE 4:
var binmsg = smp.info([ new Buffer("Hello World!") ]);
preview('Information', 'binmsg', binmsg);
var message = smp.decode(binmsg);
preview('Information', 'message', message);
preview('Information', 'data: ' + message.args[0].toString());


// Error CODE 5:
var binmsg = smp.error(400);		// error(error-code, [<arguments>])
preview('Error', 'binmsg', binmsg);
var message = smp.decode(binmsg);
preview('Error', 'error message', message);
preview('Error', 'code: ' + Number(message.args[0].toString()));
preview('Error', 'message: ' + message.args[1].toString());


// Heartbeat CODE 6:
var binmsg = smp.heartbeat();
preview('Heartbeat', 'binmsg', binmsg);
var message = smp.decode(binmsg);
preview('Heartbeat', 'message', message);


// Stop CODE 7:
var binmsg = smp.stop();
preview('Stop', 'binmsg', binmsg);
var message = smp.decode(binmsg);
preview('Stop', 'message', message);


// Pause CODE 8:
var binmsg = smp.pause();
preview('Pause', 'binmsg', binmsg);
var message = smp.decode(binmsg);
preview('Pause', 'message', message);


// Resume CODE 9:
var binmsg = smp.resume();
preview('Resume', 'binmsg', binmsg);
var message = smp.decode(binmsg);
preview('Resume', 'message', message);


// Custom CODE 13, 14 or 15:
var binmsg = smp.custom(13, [ new Buffer( JSON.stringify({foo: 'bar'}) ) ]);
preview('Custom', 'binmsg', binmsg);
var message = smp.decode(binmsg);
preview('Custom', 'message', message);
preview('Custom', 'data: ', JSON.parse(message.args[0].toString()));
