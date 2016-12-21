"use strict";
//
// SMP, Stream Parser, Decoder and EventEmitter.
//
// Version: 0.0.1
// Author: Mark W. B. Ashcroft (mark [at] fluidecho [dot] com)
// License: MIT or Apache 2.0.
//
// Copyright (c) 2015 Mark W. B. Ashcroft.
// Copyright (c) 2015 FluidEcho.
//


var Stream = require('stream').Writable;
//var preview = require('preview')('Stream');
var util = require('util');		// just to inspect, remove latter.


var fastparser = undefined;		// see: https://github.com/smprotocol/smp-node/tree/master/ccparser/
try {
  //require.resolve('.././build/Release/fastparser');
	//var fastparser = require('.././build/Release/fastparser');
} catch(e) {
	//preview('C++ SMP chunk parser is not installed, you can install if want.');
}

// ADD to msg func
/*

		// TEST: shortcuts:
			
		// { code: code, description: description, sequence_number: sn.readUInt32BE(0), id: ids.readUInt16BE(0), framex: ids.readUInt32BE(2), args: args };
		this.emit('event', { code: 0, description: '', sequence_number: 0, id: 0, framex: 0, args: this.args });
		return true;

	try {
	
      var message = this.smp.decodeStream(this.code, this.sn, this.ids, this.args);
      //var message = { code: 0, description: '', sequence_number: this.sn.readUInt32BE(0), id: 0, framex: 0, args: this.args };

      var code = -1;
      if( Object.prototype.toString.call( message ) === '[object Array]' ) {
        code = message[0].code;
      } else {
        code = message.code;
      }
      
      if ( this.options.toMessage && (code === 1 || code === 2 || code === 3) ) {      
        if ( this.frames[message.id] === undefined ) {
          this.frames[message.id] = [];
        }
        this.frames[message.id].push(message);      
      }
  
      // emit _event. if MESSAGE or FRAME also emit _event 'event'.
      switch (code) {
        case 0:
        	this.emit('event', message);
          this.emit('message', message);
          break;
        case 1:
        	this.emit('event', message);
          this.emit('frame', message);
          break;
        case 2:
        	this.emit('event', message);
          this.emit('frame', message);
          break;
        case 3:
        	this.emit('event', message);
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
        case 13:
          this.emit('custom#13', message);
          break;
        case 14:
          this.emit('custom#14', message);
          break;
        case 15:
          this.emit('custom#15', message);
          break;
      }
      
      if ( this.options.toMessage && code === 3 ) {      
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
*/	




function StreamParser(opts) {
  
  //console.log('StreamParser, opts', opts);
  
  this.options = {
    max_buffer_size: 1000000,   	// 1000000 = 1MB.
    toMessage: false,            	// if true will attempt to form whole MESSAGE from piped FRAMES.
    returnEventOnly: false				// if true and code == 0,1,2,3 will only emit 'event'.
  };  
  
  for ( var o in opts ) {
    if ( this.options[o] != undefined ) {
      this.options[o] = opts[o];
    }
  }
  
  Stream.call(this, opts);
  
  //console.log('StreamParser, options', this.options);
  
  this.state = 'start';
  this.bufsize = 0;             // =+ chunk.length, err if > options.max_buffer_size.
  this.lenbuf = new Buffer(2);
  this.snbuf = new Buffer(4);
  this.snin = false;
  this.idbuf = new Buffer(6);  
  this.smp = require('..');     // require here as global, unavaiable in _write.  
  this.max_arglen = 65535;      // 2 byte to Uint = 65,535.
  this.frames = [];             // toMessage
  
  // cc parser
  //this.trailing = new Buffer(0);
  
  // new func
  this.msg = function(code, sn, ids, args) {
    //preview('decode message function');
    // decode msg.
   
		// TEST: shortcuts:
			//this.queue['foo'].push(args[0]);
		// { code: code, description: description, sequence_number: sn.readUInt32BE(0), id: ids.readUInt16BE(0), framex: ids.readUInt32BE(2), args: args };
		
		// TODO: for frames and other smp message types, eg: info etc...

		if ( code == 0 ) {
			this.emit('event', { code: code, description: '', sequence_number: sn, id: 0, framex: 0, args: args, timestamp: timestamp });
			if ( this.options.returnEventOnly ) return;
			this.emit('message', { code: code, description: '', sequence_number: sn, id: 0, framex: 0, args: args });
			return;
		}
		

		this.emit('errorMessage', 400,'Invalid Framing (MESSAGE or FRAME framing was badly formed).');    // 'errorMessage', not 'error' to avoid confustion with this program errors.
		return;
	
	};
  
  
}

module.exports = StreamParser;
StreamParser.prototype.__proto__ = Stream.prototype;



StreamParser.prototype._write = function(chunk, encoding, next){
 
 
 // test
  /*
 var c = 0;
 for ( c = 0; c < chunk.length; c += 207 ) {
 
 	this.emit('event', { code: 0, description: '', sequence_number: 0, id: 0, framex: 0, args: [new Buffer(200)] });
 

 }
  next();
 */
 
 
 
 	//console.log('chunk: ' + util.inspect(chunk, true, 99, true));

  var c = 0;    // chunk pointer, above msg function so can reset on error.
 	var chunkLength = chunk.length; 
 	
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
 
  for ( c = c; c < chunkLength; c++) {
    //preview('chunk c: ' + c + ', state: ' + this.state + ', chunk.length: ' + chunk.length);
    
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
        
        if ( this.code <= 3 ) {
          this.state = 'sn';		// MESSAGE or FRAME.
        } else {
          this.state = 'len';
        }        
        
        break;
        
      case 'sn':
        
        if ( c + 4 <= chunk.length && this.snin === false ) {
         	///console.log('sn skip ahead 4 c: ' + c + ' chunk.length: ' + chunk.length);
          this.sn = (chunk[c] << 24) + (chunk[c+1] << 16) + (chunk[c+2] << 8) + (chunk[c+3]);		// equivalent to readUInt32BE.
          this.x = 0;
         	c = c + 3;
		      if ( this.code === 1 || this.code === 2 || this.code === 3 ) {
		        this.state = 'id';
		      } else {
		        this.state = 'len';
		      }  
		      
		      break;       	 	
        }
       
       	this.snin = true;
       	this.snbuf[this.x++] = chunk[c];
        //console.log('sn cant skip ahead!');
        // SEQUENCE_NUMBER.
        if ( 4 === this.x ) {
        	//console.log('x = 4 , SEQUENCE_NUMBER');
          this.snin = false;
          this.sn = (this.snbuf[0] << 24) + (this.snbuf[1] << 16) + (this.snbuf[2] << 8) + (this.snbuf[3]);		// equivalent to readUInt32BE.
          this.x = 0;
		      if ( this.code === 1 || this.code === 2 || this.code === 3 ) {
		        this.state = 'id';
		      } else {
		        this.state = 'len';
		      } 
        }

        break;
        
      case 'id':
        this.idbuf[this.x++] = chunk[c];
        
        // TODO: if chunk.c + 6 then skip forward 6 to read ID and FRAME#.
        
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
          this.arglen = (this.lenbuf[0] << 8) + (this.lenbuf[1]);		// equivalent to readUInt16BE.
          //this.arglen = this.lenbuf.readUInt16BE(0);
          //preview('this.arglen: ' + this.arglen);
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
              this.msg(this.code, this.sn, this.ids, this.args); 
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

        // number of bytes trailing in this argument.
        var trailing = this.arglen - this.argx;
        //preview('arg', 'trailing: ' + trailing);

        var pos = Math.min(trailing + c, chunk.length);
        //preview('arg', 'pos: ' + pos);
        
        // slice arg chunk
        var part = chunk.slice(c, pos);
        //preview('arg', 'part', part);
        
        this.argparts.push(part);
        //preview('arg', 'this.argparts', this.argparts);
        
        // check if we have the complete arg
        this.argx += pos - c;
        var done = false;
        if ( this.argx === this.arglen ) {
          done = true;
        }
        c = pos - 1;
        //preview('done: ' + done);
        if (done) {       
          this.args[this.argcx++] = Buffer.concat(this.argparts);
          this.argparts = [];   // reset.
          //preview('args: ' + this.args.length, this.args);
        }

        // no more args
        if (this.argcx === this.argc) {
        	this.msg(this.code, this.sn, this.ids, this.args); 
          //this.msg();        
          this.state = 'start';
          this.bufsize = 0;           
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

