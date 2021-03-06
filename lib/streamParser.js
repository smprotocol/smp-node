"use strict";
//
// SMP, Stream Parser, Decoder and EventEmitter.
//
// Version: 0.0.2
// Author: Mark W. B. Ashcroft (mark [at] fluidecho [dot] com)
// License: MIT or Apache 2.0.
//
// Copyright (c) 2015-2017 Mark W. B. Ashcroft.
// Copyright (c) 2015-2017 FluidEcho.
//


var Stream = require('stream').Writable;
//var preview = require('preview')('Stream Parser');



function StreamParser(opts) {

  this.options = {
    max_buffer_size: 1000000,   // 1000000 = 1MB.
    toMessage: false,            // if true will attempt to form whole MESSAGE from piped FRAMES.
    namespace: ''
  };

  for ( var o in opts ) {
    if ( this.options[o] != undefined ) {
      this.options[o] = opts[o];
    }
  }

  Stream.call(this, opts);

  this.state = 'start';
  this.bufsize = 0;             // =+ chunk.length, err if > options.max_buffer_size.
  this.lenbuf = new Buffer(2);
  this.idbuf = new Buffer(6);
  this.smp = require('..');     // require here as global, unavaiable in _write.
  this.max_arglen = 65535;      // 2 byte to Uint = 65,535.
  this.frames = [];             // toMessage

}

module.exports = StreamParser;
StreamParser.prototype.__proto__ = Stream.prototype;



StreamParser.prototype._write = function(chunk, encoding, next){

 //console.log('parser chunk', chunk);

  var c = 0;    // chunk pointer, above msg function so can reset on error.

  // TODO: dont have function here, make it ouside this function, cause is always being called.

  // form bin message from buffer, decode and emit event.
  this.msg = function() {
    //console.log('decode message function');

    // decode msg.
    try {

			// TODO: this parser needs updating to work with sequence number, smp spec version 1.1!
      var message = this.smp.decodeStream(this.code, 'sn', this.ids, this.args);
      //console.log('message', message);

      var flag = -1;
      if( Object.prototype.toString.call( message ) === '[object Array]' ) {
        flag = message[0].flag;
      } else {
        flag = message.flag;
      }

      if ( this.options.toMessage && (flag === 1 || flag === 2 || flag === 3) ) {
        if ( this.frames[message.id] === undefined ) {
          this.frames[message.id] = [];
        }
        this.frames[message.id].push(message);
      }

      // emit event.
      switch (flag) {
        case 0:
          this.emit('message', message);
          break;
        case 1:
          this.emit('frame', message);
          break;
        case 2:
          this.emit('frame', message);
          break;
        case 3:
          this.emit('frame', message);
          break;
        case 4:
          this.emit('information', message);
          break;
        case 5:
          this.emit('errorMessage', Number(message.args[0].toString()), message.args[1].toString());    // 'errorMessage', not 'error' to avoid confustion with this program errors.
          break;
        case 6:
          this.emit('heartbeat', message)
          break;
        case 7:
          this.emit('stop', message);
          break;
        case 8:
          this.emit('pause', message);
          break;
        case 9:
          this.emit('resume', message);
          break;
        case 10:
          this.emit('checkpoint', message);
          break;
        case 11:
          this.emit('namespace', message);
          break;
        case 12:
          this.emit('block', message);
          break;
        case 13:
          this.emit('row', message);
          break;
        case 14:
        	message.ident = this.ident;
          this.emit('super', message);
          break;
        // 15 is reserved.
      }

      if ( this.options.toMessage && flag === 3 ) {
        var id = message.id;
        var message = this.smp.toMessage(this.frames[id]);    // if invalid will return false.
        this.frames[id] = [];
        this.emit('message', message);
      }

    } catch (e) {
      //preview('stream decode error', e);
      //console.log('stream decode error', e);
      this.emit('err', 'Invalid Framing (MESSAGE or FRAME framing was badly formed). client error.code:400.', e);   // emitting 'err', not 'error' so can carry on.
      // reset
      c = chunk.length;   // so skips processing this chunk.
      this.state = 'start';
      this.bufsize = 0;
    }

  };


  //preview('chunk', chunk);
  this.bufsize += chunk.length;
  if ( this.bufsize > this.options.max_buffer_size ) {
    this.emit('err', 'buffer chunks exceed max_buffer_size! advise send client error.code:416 and close client.');    // emitting 'err', not 'error' so can carry on.
    // reset
    c = chunk.length;   // so skips processing this chunk.
    this.state = 'start';
    this.bufsize = 0;
    //return cb(false);   // use this if want to terminate stream.
  }

  for ( c = c; c < chunk.length; c++) {
    //console.log('chunk c: ' + c + ', state: ' + this.state + ', namespace: ' + this.options.namespace + ', chunk.length: ' + chunk.length);

    // TODO: 1- replace readUInt16BE and readUInt32BE with faster.
    //			 2- add sequence number param if message/frame.

    switch (this.state) {
      case 'start':
        var meta = chunk[c];
        this.code = meta >> 4;
        if ( this.code > 15 ) {
          this.emit('err', 'Invalid Code! send client error.code:415.');    // emitting 'err', not 'error' so can carry on.
          // reset
          c = chunk.length;   // so skips processing this chunk.
          this.state = 'start';
          this.bufsize = 0;
        }
        //preview('this.code: ' + this.code);
        this.argc = meta & 0xf;
        if ( this.argc > 15 ) {
          this.emit('err', 'arguments exceed 15! send client error.code:414.');   // emitting 'err', not 'error' so can carry on.
          // reset
          c = chunk.length;   // so skips processing this chunk.
          this.state = 'start';
          this.bufsize = 0;
        }
       //preview('this.argc: ' + this.argc);
        this.args = [];   // array of all ARGUMENTS for this MESSAGE/FRAME as Buffers.
        this.argparts = [];
        this.ids = undefined;   // ID & FRAME# concated as Buffer.
        this.argcx = 0;
        this.x = 0;
        this.ident = 0;

        if ( this.code === 14 ) {		// super
        	this.ident = this.argc;
        	this.argc = 3;		// supper fixed at three args
        }

        if ( this.code === 1 || this.code === 2 || this.code === 3 ) {
          this.state = 'id';
        } else {
          this.state = 'len';
        }

        break;

      case 'id':
        this.idbuf[this.x++] = chunk[c];

        // combined ID and FRAME#.
        if ( 6 === this.x ) {
          var buf = new Buffer(6);
          buf[0] = this.idbuf[0];
          buf[1] = this.idbuf[1];
          buf[2] = this.idbuf[2];
          buf[3] = this.idbuf[3];
          buf[4] = this.idbuf[4];
          buf[5] = this.idbuf[5];
          this.ids = buf;
          this.x = 0;
          if ( this.argc === 0 ) {
            this.msg();
            this.state = 'start';
            this.bufsize = 0;
            break;
          } else {
            this.state = 'len';
          }
        }

        break;

      case 'len':
        this.lenbuf[this.x++] = chunk[c];

        // ARGUMENT length.
        if ( 2 === this.x ) {
          this.arglen = ((this.lenbuf[0] << 8) + (this.lenbuf[1])) >>> 0; 		// equivalent to readUInt16BE.
          //console.log('this.arglen: ' + this.arglen);
          if ( this.arglen > this.max_arglen ) {
            this.emit('err', 'argument length exceed max_arglen! send client error.code:414.');   // emitting 'err', not 'error' so can carry on.
            // reset
            c = chunk.length;   // so skips processing this chunk.
            this.state = 'start';
            this.bufsize = 0;
          }
          if ( this.arglen === 0 ) {
            this.args[this.argcx++] = new Buffer(0);
            if (this.argcx === this.argc) {
              this.msg();
              this.state = 'start';
              this.bufsize = 0;
              break;
            }
            this.state = 'len';
            this.x = 0;
          } else {
            this.argx = 0;
            this.state = 'arg';
          }
        }
        break;

      case 'arg':
        // ARGUMENT.

				//console.log('this.arglen: ' + this.arglen + ', this.argx: ' + this.argx);

        // number of bytes trailing in this argument.
        var trailing = this.arglen - this.argx;
        //console.log('arg', 'trailing: ' + trailing);

        var pos = Math.min(trailing + c, chunk.length);
        //console.log('arg', 'pos: ' + pos);

        // slice arg chunk
        var part = chunk.slice(c, pos);
        //console.log('arg', 'part', part);

        this.argparts.push(part);
        //console.log('arg', 'this.argparts', this.argparts);

        // check if we have the complete arg
        this.argx += pos - c;
        var done = false;
        if ( this.argx === this.arglen ) {
          done = true;
        }
        c = pos - 1;
        //console.log('done: ' + done + ', c: ' + c);
        if (done) {
          this.args[this.argcx++] = Buffer.concat(this.argparts);
          this.argparts = [];   // reset.
          //console.log('args: ' + this.args.length, this.args);
        }

        // no more args
        if (this.argcx === this.argc) {
          this.msg();
          this.state = 'start';
          this.bufsize = 0;
          //console.log('loop please c ' + c + ' state ' + this.state);
          break;
        }

        if (done) {
          this.state = 'len';
          this.x = 0;
        }
        break;
    }
  }

  next();   // Need this and 'encoding' as inbuilt _write function.
};
