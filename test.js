var smp = require('./');
var assert = require('assert');
var preview = require('preview')('test');

var closed;

var mbin = smp.encode([new Buffer('hello'), new Buffer('world')]).toBuffer();
preview('mbin', mbin);

var mmsg = smp.decode(mbin);
preview('mmsg', mmsg);

assert.equal(mmsg.args[0].toString(), 'hello');
assert.equal(mmsg.args[1].toString(), 'world');

var fbin = smp.encode([new Buffer('abcdefghijklmnopqrstuvwxyz'), new Buffer("0123456789")], {max_message_size: 10});
preview('fbin', fbin);

var fmsg = smp.decode(fbin.frames);
preview('fmsg', fmsg);

assert.equal(fmsg[0].code, 1);
assert.equal(fmsg[6].code, 3);

closed = true;

assert(closed);

