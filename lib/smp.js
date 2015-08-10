"use strict";
//
// SMP, Streaming Message Protocol for Node.js
//
// Version: 0.0.1
// Author: Mark W. B. Ashcroft (mark [at] fluidecho [dot] com)
// License: MIT or Apache 2.0.
//
// Copyright (c) 2015 Mark W. B. Ashcroft.
// Copyright (c) 2015 FluidEcho.
//
// About SMP Specification see: http://smprotocol.github.io/
// This program conforms with SMP-Spec Version 1.0
//


//var preview         = require('preview')('smp');
var codes           = require('./codes');
var errors          = require('./errors');
var StreamParser    = require('./streamParser');


var Message = function () {};
module.exports = new Message();

Message.prototype.StreamParser = StreamParser;      // expose stream parser.


var SPEC = '1.0';
var Options = {
  max_message_size: 1493,     // MTU default is 1500, (1500 - 7), must be greater than: this - (argc * 2).
  id: 0,                      // MESSAGE ID, from 0 to 65,535.
  complete: true,             // if true last encode FRAME will be CODE:3.
  first: true,                // if true first encode FRAME will be CODE:1.
  toFrame: false              // if true will encode as FRAME even if ARGUMMENTS size < max_message_size.
};

var ids = {};     // stores ID's and their FRAME#'s.
var idsnum = 0;   // ids pointer, what id number are at, new use ++.



// Array of Buffers concatenated to one Buffer.
Message.prototype.toBuffer = function (arr) {

  if( Object.prototype.toString.call( arr ) != '[object Array]' ) {
    arr = [arr];
  }

  return Buffer.concat(arr);

};


Message.prototype.encode = function (args, options) {

  if ( options === undefined ) var options = {};

  if ( options.max_message_size === undefined ) {
    options.max_message_size = Options.max_message_size;
  }

  // complete: boolean, true and FRAME last FRAME will be LAST FRAME CODE(3). 
  var argc = args.length;
  var len = 0;

  // data PAYLOAD length
  for (var i = 0; i < argc; i++) {
    len += args[i].length;  
  }
  //preview('PAYLOAD length: ' + len + ', ARGUMENTS length: ' + (len + (argc * 2)));

  this.frames = undefined;
  var toBuffer = function () {
    //preview('toBuffer');
    if( Object.prototype.toString.call( this.frames ) != '[object Array]' ) {
      this.frames = [this.frames];
    }   
    return Buffer.concat(this.frames);
  };


  if ( len + (argc * 2) > options.max_message_size || options.id != undefined || options.toFrame ) {
    //preview('len > max_message_size, make FRAMES');
    this.frames = frames(args, len, argc, options);   // make as FRAMES.
    return {toBuffer: toBuffer, frames: this.frames};
  }

  // WHOLE MESSAGE, CODE 0:
  
  var offset = 0;
  var code = 0;
  
  // data ARGUMENTS length
  len += (argc * 2) + 1;

  // buffer
  var buf = new Buffer(len);

  // CODE/ARGC
  buf[0] = code << 4 | argc;
  
  offset++;

  // ARGUMENTS
  for (var i = 0; i < argc; i++) {
    var arg = args[i];

    buf.writeUInt16BE(arg.length, offset);    // writeUInt16BE for 2 BYTES ARGUMENT LEMGTH.
    offset += 2;    // +2 BYTES for ARGUMENT LENGTH.

    arg.copy(buf, offset);
    offset += arg.length;
  }

  this.frames = [buf];    // returns array wrapper to make same as frames return.
  return {toBuffer: toBuffer, frames: this.frames};
  
};



function frames(args, len, argc, options) {
  //preview('make FRAMES');

  // TODO: fix this returns unbalenced frames: var binmsg = smp.encode([ new Buffer('abcdefghijklmnopqrstuvwxyz'), new Buffer('0123456789'), new Buffer('ABCDEFGHIJKLMNOPQRSTUVWX') ], {max_message_size: 20, id: 555, first: true, complete: true});

  var code = 1;   // NEW FRAME

  // ID
  var id = 0;
  if ( options.id === undefined ) {
    // new id:
    id = idsnum++;      // ID, first ID will be 0.
    ids[id.toString()] = 0;     // FRAME# (ids[id.toString]++)
  } else {
    id = options.id;
    if ( ids[id.toString()] === undefined ) {
      // add this id to list.
      ids[id.toString()] = 0;     // FRAME# (ids[id.toString]++)
    }
    code = 2;   // CONTINUING FRAME
  }

  if ( options.first != undefined ) {
    if ( options.first ) {
      code = 1;   // FIRST FRAME
    }
  }

  if ( id > 65535 ) {
    return false;   // ID can't be greater than 65535!
  }
  
  ////preview('id: ' + id + ', ids', ids);

  var complete = true;
  if ( options.complete != undefined ) {
    if ( options.complete === false ) {
      complete = false;
    }
  }

  // SMP-Spec#4.3. FRAME ARGUMENTS are to be sent sequentially by MAX-MESSAGE-SIZE.

  var frames = [];    // !important! that frames and arguments within are kept ordered!
  frames[0] = new Array(argc);    // first frame arrays
  var f = 0;
  var fs = 0;   // frame size counter
  var mms = options.max_message_size - (argc * 2);    // minus arg lengths, 2 bytes per arg.
  var a = 0;
  var remainder = 0;
  
  for ( a = 0; a < argc; a++ ) {
    //preview('ARGS- args['+a+']; length: ' + args[a].length + '; a++: ' + a + ', remainder: ' + remainder);
    
    var p = 0;
    for( p = 0; p < args[a].length; p += mms ) {
    
      // if remainder, put first
      if ( remainder > 0 ) {
        if ( remainder > args[a].length ) {
          //preview('remainder greater than arg length');
        } else {
          //preview('FRAME- remainder('+remainder+') frames['+f+'], args['+a+'] , 0:' + remainder);
          frames[f][a] = new Buffer(remainder);
          args[a].copy(frames[f][a], 0, 0, remainder);
          p = remainder;
          remainder = 0;    // reset
          f++;
          //preview('NEXT FRAME, f++ f: ' + f);
          frames[f] = new Array(argc);                
        }
      }
    
      // frame arg.
      var z = p + mms;
      if ( z > args[a].length ) {
        z = args[a].length;
      }
      
      fs += z - p;
      //preview('fs: ' + fs);
      if ( fs < mms ) {
        remainder = mms - fs;
      } else {
        remainder = 0;
        fs = 0;
      }
      //preview('remainder: ' + remainder); 
      
      //preview('ARG- a: ' + a + ', p: ' + p + ', length: ' + args[a].length + ', z: ' + z + ', remainder: ' + remainder);
      
      if ( z > p ) {
        frames[f][a] = new Buffer(z - p);
        //preview('remainder: ' + remainder);
        //preview('FRAME-  frames['+f+'], args['+a+'] , ' + p + ':' + z);
        args[a].copy(frames[f][a], 0, p, z);
      }

      if ( remainder <= 0 ) {
      
        // TODO: use code bellow to form the binary frame now.
      
        f++;
        //preview('NEXT FRAME, f++ f: ' + f);
        frames[f] = new Array(argc);
      }       
      
    }
    
  }

  // TODO: test for unwanted null frame array items.
/*
  // UPDATE: if creating a null arg frame, eg empty last frame, want empty array to form empty frame.
  var cleanup = true;
  for ( var x = 0; x < argc; x++ ) {
    if (typeof frames[f][x] !== 'undefined') {
      //preview('not empty frame!');
      cleanup = false;
    }
  }
  if ( cleanup ) {
    //preview('cleanup empty trailing frame');
    frames.splice(-1,1);    // cleanup delete last array item as is null.
  }
*/

  // now form binary frames.
  var framesx = [];
  
  //preview('frames', frames);

  for ( var fm = 0; fm < frames.length; fm++ ) {

    var framelen = 7;   // FRAME = 7 meta bytes.
    for ( var ax = 0; ax < argc; ax++ ) {
      if ( frames[fm][ax] === undefined ) {
        framelen += 0;
      } else {
        framelen += frames[fm][ax].length;
      }
    }
    //preview('framelen', framelen);
    // TODO: test code if single frame!
    if ( fm + 1 === frames.length ) {
      if ( complete ) {
        code = 3;
      } else {
        if ( frames.length > 1 ) {
          code = 2;
        }
      }
    }   
    //console.log('code', code);
    var buf = new Buffer(framelen + (argc * 2));    // + 2 bytes per arg.
    var off = 0;
    
    // pack meta:
    
    // CODE/ARGC
    buf[off++] = code << 4 | argc;
    
    // ID
    buf.writeUInt16BE(id, off);   // writeUInt16BE for 2 BYTES ID.
    off += 2;   // +2 BYTES for ID.   
    
    // FRAME#
    var framex = ids[id.toString()]++;
    if ( framex > 4294967295 ) {
      return false;   // FRAME# can not be > 4,294,967,295.
    }
    buf.writeUInt32BE(framex, off);   // writeUInt32BE for 4 BYTES FRAME#
    off += 4;   // +4 BYTES for FRAME#.       
    
    //preview('buf pack meta', buf);
    
    for ( var ag = 0; ag < argc; ag++ ) {
      
      var arg = frames[fm][ag];
      if ( arg === undefined ) {
        arg = new Buffer(0);
      }
      //preview('arg',  arg);
      
      var arglen = 0;
      if ( frames[fm][ag] === undefined ) {
        arglen = 0;
      } else {
        arglen = frames[fm][ag].length;
      }
      
      //preview('arglen: ' +  arglen);
      //preview('off: ' +  off);
      
      buf.writeUInt16BE(arglen, off);   // writeUInt16BE for 2 BYTES ARGUMENT LEMGTH.
      off += 2;   // +2 BYTES for ARGUMENT LENGTH.

      arg.copy(buf, off);
      off += arg.length;      
    
    }
    
    //preview('buf', buf);
    
    if ( code === 1 ) {
      code = 2;
    }   
    
    framesx.push(buf);
  
  } 

  return framesx;   // returns array wrapper to make same as frames return
  
}



// TODO: make frame making fatser.
function frames_workInProgress_makeFaster(args, len, argc, options) {
  //preview('make FRAMES');

  var mms = options.max_message_size - (argc * 2);    // minus arg lengths, 2 bytes per arg.
  //preview('mms', mms);
  
  var code = 1;   // NEW FRAME

  // ID
  var id = 0;

  if ( options.id === undefined ) {
    // new id:
    // TODO: DONT USE Object.keys!!!!!!!!!! WAY SLOW!!!!!!!!!!!!!!!!!
    //id = Object.keys(ids).length++;     // ID, first ID will be 0.
    id = idsnum++;
    ids[id.toString()] = 0;     // FRAME# (ids[id.toString]++)
  } else {
    id = options.id;
    if ( ids[id.toString()] === undefined ) {
      // add this id to list.
      ids[id.toString()] = 0;     // FRAME# (ids[id.toString]++)
    }
    code = 2;   // CONTINUING FRAME
  }
  
  if ( options.first != undefined ) {
    if ( options.first ) {
      code = 1;   // FIRST FRAME
    }
  }
  
  if ( id > 65535 ) {
    return false;   // ID can't be greater than 65535!
  }

  ////preview('id: ' + id + ', ids', ids);

  var complete = true;
  if ( options.complete != undefined ) {
    if ( options.complete === false ) {
      complete = false;
    }
  }

  var framesize = 7 + (argc * 2) + mms;
  //preview('framesize', framesize);
  
  
  var framesnum = Math.ceil(len / mms);
  //preview('framesnum', framesnum);

  var frames = new Array(framesnum);
  
  for ( var f = 0; f < framesnum; f++ ) {
    
    frames[f] = new Buffer(framesize);
    
    if ( f + 1 === frames.length ) {
      if ( complete ) {
        code = 3;
      } else {
        code = 2;
      }
    }   
    
    
    var off = 0;
    
    // pack meta:
    
    // CODE/ARGC
    frames[f][off++] = code << 4 | argc;
    
    // ID
    frames[f].writeUInt16BE(id, off);   // writeUInt16BE for 2 BYTES ID.
    off += 2;   // +2 BYTES for ID.   
    
    // FRAME#
    frames[f].writeUInt32BE(ids[id.toString()]++, off);   // writeUInt32BE for 4 BYTES FRAME#
    off += 4;   // +4 BYTES for FRAME#. 
          
    var arglen = mms;

    //preview('arglen: ' +  arglen);
    //preview('off: ' +  off);
      
    frames[f].writeUInt16BE(arglen, off);   // writeUInt16BE for 2 BYTES ARGUMENT LEMGTH.         

  }

  //preview('frames', frames);
  return frames;

}



Message.prototype.decode = function (bufs) {

  if ( bufs === false ) return false;

  if( Object.prototype.toString.call( bufs ) != '[object Array]' ) {
    bufs = [bufs];
  }

  var frames = [];

  for ( var f = 0; f < bufs.length; f++ ) {

    //preview('decode', 'bufs f: ' + f + ' bufs[f]', bufs[f]); 

    var offset = 0;

    // unpack meta
    var meta = bufs[f][offset];
    
    var code = meta >> 4;
    //preview('decode', 'code: ' + code);

    var argc = meta & 0xf;
    //preview('decode', 'argc: ' + argc);
    var args = new Array(argc);
    
    offset++;

    // CODE determination:

    // whole MESSAGE or non payload message:
    if ( code != 1 && code != 2 && code != 3 ) {

      // unpack args
      for (var a = 0; a < argc; a++) {

        //preview('decode', 'a: ' + a);

        var len = bufs[f].readUInt16BE(offset);
        
        //preview('len: ' + len);

        offset += 2;

        var arg = bufs[f].slice(offset, offset += len);
        args[a] = arg;

        //preview('decode', 'arg', arg);

      }

      var description = codes.codes.filter(function(_code) {
        return _code.code == code;
      })[0].description.toLowerCase();

      return { code: code, description: description, args: args };

    }

    // CODE 1 or 2, FRAME:

    var id = bufs[f].readUInt16BE(offset);
    //preview('decode', 'id: ' + id);
    
    offset+=2;

    var framex = bufs[f].readUInt32BE(offset);
    //preview('decode', 'framex: ' + framex);

    offset += 4;

    // unpack args
    for (var a = 0; a < argc; a++) {
    
      //preview('decode', 'a: ' + a);
    
      var len = bufs[f].readUInt16BE(offset);
      
      //preview('len: ' + len);
      
      offset += 2;

      var arg = bufs[f].slice(offset, offset += len);
      args[a] = arg;
      
      //preview('decode', 'arg', arg);

    }

    //preview('decode', 'frames.push f: ' + f + ' args', args);
    
    var description = codes.codes.filter(function(_code) {
      return _code.code == code;
    })[0].description.toLowerCase();    
    
    frames.push({ code: code, description: description, id: id, framex: framex, args: args });

  }

  return frames;

};



Message.prototype.decodeStream = function (code, ids, args) {

  //preview('decodeStream', 'code: ' + code);
  //preview('decodeStream', 'args: ' + args);
  
  var description = codes.codes.filter(function(_code) {
    return _code.code == code;
  })[0].description.toLowerCase();  

  // whole MESSAGE or non payload message.
  if ( code != 1 && code != 2 && code != 3 ) {
    return { code: code, description: description, args: args };
  }
  
  // FRAME.
  return { code: code, description: description, id: ids.readUInt16BE(0), framex: ids.readUInt32BE(2), args: args };

};



// FRAMES (Array) to a MESSAGE.
Message.prototype.toMessage = function (frames) {

  //preview('toMessage');

  var argsx = [];
  var id = undefined;     // FRAME ID.
  var complete = false;   // CODE 3 or whole MESSAGE.

  if( Object.prototype.toString.call( frames ) != '[object Array]' ) {
    return false;   // frames must be array of!
  }

  if ( frames[0].code != 1 && frames[0].code != 2 && frames[0].code != 3 ) {
    return frames;    // already a message!
  }

  // order frames by FRAME#
  frames.sort(function(fx1, fx2) {
    return fx1.framex - fx2.framex;
  });
  
  for ( var f = 0; f < frames.length; f++ ) {

    //console.log('toMessage', 'bufs f: ' + f + ' bufs[f]', frames[f]); 
    
    var code = frames[f].code;
    //preview('toMessage', 'code: ' + code);

    var argc = frames[f].args.length;
    //console.log('toMessage', 'argc: ' + argc);
    var args = new Array(argc);

    var _id = frames[f].id;
    //preview('toMessage', '_id: ' + _id);
    
    if ( id === undefined ) {
      id = _id;   // use first inputed ID.
    }
    
    if ( id === _id ) {
      if ( code === 3 ) {
        complete = true;
      }
    } else {
      return false;
    }

    // unpack args
    for (var a = 0; a < argc; a++) {
    
      //console.log('toMessage', 'a: ' + a);
      //args[a] = frames[f].args[a];
      //console.log('arg', frames[f].args[a]);
      
      if ( frames[f].args[a].length === 0 ) {
        continue;
      }

      if ( argsx[a] === undefined ) {
        argsx[a] = new Buffer(0);
        //argsx[a] = [];
      }
      argsx[a] = Buffer.concat([argsx[a], frames[f].args[a]], argsx[a].length + frames[f].args[a].length); 
      //argsx[a] += Buffer.concat(frames[f].args[a]);
    }

    //console.log('toMessage', 'frames.push f: ' + f + ' args', args);

  }

  //console.log('argsx', argsx);

  return { id: id, complete: complete, args: argsx };

};



// INFOMATION (CODE 4) Message
Message.prototype.info = function (args) {
  return infos(args, 4);    // CODE 4: INFORMATION
};



// ERROR (CODE 5) Message
Message.prototype.error = function (errCode, args) {

  var errMessage = errors.errors.filter(function(code) {
    return code.code == errCode;
  })[0].message;  

  //preview('errMessage', errMessage);
  
  if ( args === undefined ) {
    args = new Array(0);
  }
  
  var _args = [new Buffer(errCode.toString()), new Buffer(errMessage)].concat(args);
  //preview('_args', _args);  

  return infos(_args, 5);   // CODE 5: ERROR
  
};



// HEARTBEAT (CODE 6) Message
Message.prototype.heartbeat = function (args) {
  if ( args === undefined ) args = new Array(0);
  return infos(args, 6);    // CODE 6: HEARTBEAT
};



// STOP (CODE 7) Message
Message.prototype.stop = function (args) {
  if ( args === undefined ) args = new Array(0);
  return infos(args, 7);    // CODE 7: STOP
};



// PAUSE (CODE 8) Message
Message.prototype.pause = function (args) {
  if ( args === undefined ) args = new Array(0);
  return infos(args, 8);    // CODE 8: PAUSE
};



// RESUME (CODE 9) Message
Message.prototype.resume = function (args) {
  if ( args === undefined ) args = new Array(0);
  return infos(args, 9);    // CODE 9: RESUME
};



// USER DEFINED/CUSTOM (CODE 13, 14 or 15) Message
Message.prototype.custom = function (code, args) {
  if ( args === undefined ) args = new Array(0);
  return infos(args, code);   // CODE 13, 14 or 15: USER DEFINED
};



// non MESSAGE/FRAME.
function infos(args, code) {
  
  var argc = args.length;
  var len = 0;
  var offset = 0;
  
  // data PAYLOAD length
  for (var i = 0; i < argc; i++) {
    len += args[i].length;  
  }
  len += (argc * 2) + 1;    // payload data ARGUMENTS length
  //preview('len: ' + len);
  // message buffer
  var buf = new Buffer(len);

  // pack meta: CODE/ARGC
  buf[offset] = code << 4 | argc;
  
  offset++;

  // pack args
  for (var i = 0; i < argc; i++) {
    var arg = args[i];
    //preview('arg.length: ' + arg.length);

    buf.writeUInt16BE(arg.length, offset);    // writeUInt16BE for 2 BYTES ARGUMENT LEMGTH.
    offset += 2;    // +2 BYTES for ARGUMENT LENGTH.

    arg.copy(buf, offset);
    offset += arg.length;
  }

  return [buf];   // returns array wrapper to make same as frames return.
  
}

