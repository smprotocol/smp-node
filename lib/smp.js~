"use strict";
//
// SMP, Streaming Message Protocol for Node.js
//
// Version: 1.1.0
// Author: Mark W. B. Ashcroft (mark [at] fluidecho [dot] com)
// License: MIT or Apache 2.0.
//
// Copyright (c) 2016 Mark W. B. Ashcroft.
// Copyright (c) 2016 FluidEcho.
//
// About SMP Specification see: http://smprotocol.github.io/
// This program conforms with SMP-Spec Version 1.1-DRAFT
//


//var preview         = require('preview')('smp');
var flags           = require('./flags');
var errors          = require('./errors');
var StreamParser    = require('./streamParser');



var Message = function () {};
module.exports = new Message();


function register(module) {
  Message.prototype[module.name] = module;         // deploy your own module.
}

module.exports.register = register;



Message.prototype.StreamParser = StreamParser;      // expose stream parser.



var SPEC = '1.1';

// TODO: Merge Options, into user options.
var Options = {
  max_message_size: 1493,     // MTU default is 1500, (1500 - 7), must be greater than: this - (argc * 2).
  id: 0,                      // MESSAGE ID, from 0 to 65,535.
  sequence_number: 0,         // SEQUENCE NUMBER, from 0 to 4,294,967,295.
  complete: true,             // if true last encode FRAME will be CODE:3.
  first: true,                // if true first encode FRAME will be CODE:1.
  toFrame: false,             // if true will encode as FRAME even if ARGUMMENTS size < max_message_size.
  sn: 0                       // sequence number.
};

// TODO: Merge Options, into user options (THESE INTO this.Options).
var ids = {};     // stores ID's and their FRAME#'s.
var idsnum = 0;   // ids pointer, what id number are at, new use ++.
var sequence_numbernum = 0;   // SEQUENCE NUMBER pointer ++.

// TODO: add totalBufLength to all conact, is faster! Buffer.concat([], totalBufLength)

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

  // sequence_number
  var sequence_number = 0;    // TODO: fix
  if ( options.sequence_number === undefined ) {
    // new id:
    sequence_number = Options.sn++;
  } else {
    sequence_number = options.sequence_number;
  }
  options.sequence_number = sequence_number;
  
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
  
  // TODO: SMP-Version: 1.1-DRAFT, including a embeded 32 bit sequence number to MESSAGES and FRAMES.
  // MESSAGE, EG:
  //                                         +----------------------+
  //                                         | PAYLOAD ARGS: [0:15] |
  // +---------+-----------+-----------------+----------------------+  
  // | Message | FLAG/ARGC | SEQUENCE_NUMBER | LENGTH | PAYLOAD     | 
  // +---------+-----------+-----------------+----------------------+  
  // | OCTETS  | 0         | 1,2,3,4         | 5,6    | <LENGTH>    |
  // +---------+-----------+-----------------+----------------------+
  
  //                                                    +----------------------+
  //                                                    | PAYLOAD ARGS: [0:15] |
  // +---------+-----------+----------+-----------------+--------+-------------+  
  // | Message | FLAG/ARGC | CRC-32   | SEQUENCE_NUMBER | LENGTH | PAYLOAD     | 
  // +---------+-----------+----------+-----------------+--------+-------------+  
  // | OCTETS  | 0         | 1,2,3,4  | 5,6,7,8         | 9,10   | <LENGTH>    |
  // +---------+-----------+----------+-----------------+--------+-------------+  
  
  // v3
  //                       +----------------------+
  //                       | PAYLOAD ARGS: [0:15] |
  // +---------+-----------+--------+-------------+  
  // | Message | FLAG/ARGC | LENGTH | PAYLOAD     | 
  // +---------+-----------+--------+-------------+  
  // | OCTETS  | 0         | 1, 2   | <LENGTH>    |
  // +---------+-----------+--------+-------------+  

  // TODO: bitwise for unsigned should be >>> or >> ? SEE -> http://stackoverflow.com/questions/6798111/bitwise-operations-on-32-bit-unsigned-ints
  
  var offset = 0;
  var flag = 0;
  
  // data ARGUMENTS length
  len += (argc * 2) + 1;

  // buffer
  var buf = new Buffer(len);

  // CODE/ARGC
  buf[offset++] = flag << 4 | argc;

  // ARGUMENTS
  for (var i = 0; i < argc; i++) {
    var arg = args[i];

    // form UInt16BE:
    buf[offset++] = arg.length >>> 8 & 0xff;
    buf[offset++] = arg.length & 0xff; 

    arg.copy(buf, offset);
    offset += arg.length;
  }

  this.frames = [buf];    // returns array wrapper to make same as frames return.
  return {toBuffer: toBuffer, frames: this.frames};
  
};



function frames(args, len, argc, options) {
  //preview('make FRAMES');

  // TODO: fix this returns unbalenced frames: var binmsg = smp.encode([ new Buffer('abcdefghijklmnopqrstuvwxyz'), new Buffer('0123456789'), new Buffer('ABCDEFGHIJKLMNOPQRSTUVWX') ], {max_message_size: 20, id: 555, first: true, complete: true});

  var flag = 1;   // NEW FRAME

  // TODO: better id handling, maybe reset idsnum = 0 if > 65535.
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
    flag = 2;   // CONTINUING FRAME
  }

  if ( options.first != undefined ) {
    if ( options.first ) {
      code = 1;   // FIRST FRAME
    }
  }

  if ( id > 65535 ) {
    delete ids[id.toString()];    // reset.
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
        flag = 3;
      } else {
        if ( frames.length > 1 ) {
          flag = 2;
        }
      }
    }   
    //console.log('code', code);
    var buf = new Buffer(framelen + (argc * 2));    // + 2 bytes per arg.
    var off = 0;
    
    // pack meta:
    
    // CODE/ARGC
    buf[off++] = flag << 4 | argc;
    
    // TODO: sequence_number should be: this.options.sequence_number++
    // SEQUENCE NUMBER
    buf.writeUInt32BE(options.sequence_number++, off);
    off += 4;   // +4 BYTES for SEQUENCE NUMBER    
    
    // ID
    buf.writeUInt16BE(id, off);   // writeUInt16BE for 2 BYTES ID.
    off += 2;   // +2 BYTES for ID.   
    
    // FRAME#
    var framex = ids[id.toString()]++;
    if ( framex > 4294967295 ) {
      ids[id.toString()] = 0;   // reset
      framex = 0;
      //return false;   // FRAME# can not be > 4,294,967,295.
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
    
    if ( flag === 1 ) {
      flag = 2;
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
  
  var flag = 1;   // NEW FRAME

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
    flag = 2;   // CONTINUING FRAME
  }
  
  if ( options.first != undefined ) {
    if ( options.first ) {
      flag = 1;   // FIRST FRAME
    }
  }
  
  if ( id > 65535 ) {
    delete ids[id.toString()];    // reset.
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
        flag = 3;
      } else {
        flag = 2;
      }
    }   
    
    
    var off = 0;
    
    // pack meta:
    
    // CODE/ARGC
    frames[f][off++] = flag << 4 | argc;
    
    // ID
    frames[f].writeUInt16BE(id, off);   // writeUInt16BE for 2 BYTES ID.
    off += 2;   // +2 BYTES for ID.   
    
    // FRAME#
    // TODO: test this!
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
    var meta = bufs[f][offset++];
    
    var flag = meta >> 4;
    //preview('decode', 'flag: ' + flag);

    var argc = meta & 0xf;

		if ( flag === 13 ) {
			// block
			return _decodeBlock(argc, bufs[f]);
		}

    //preview('decode', 'argc: ' + argc);
    var args = new Array(argc);
    
    //offset++;
    
    // if payload message unpack sequence number.
    var sequence_number = -1;
    if ( flag < 4 ) {
      sequence_number = (bufs[f][offset++] << 24) + (bufs[f][offset++] << 16) + (bufs[f][offset++] << 8) + (bufs[f][offset++]);   // equivalent to readUInt32BE.
      //sequence_number = bufs[f].readUInt32BE(offset);
      //offset += 4;    // +4 BYTES for SEQUENCE NUMBER     
    }

    // FLAG determination:

    // whole MESSAGE or non payload message:
    if ( flag != 1 && flag != 2 && flag != 3 ) {

      // unpack args
      for (var a = 0; a < argc; a++) {

        //preview('decode', 'a: ' + a);

        //var len = bufs[f].readUInt16BE(offset);
        var len = (bufs[f][offset++] << 8) + (bufs[f][offset++]);   // equivalent to readUInt16BE.
        
        //preview('len: ' + len);

        //offset += 2;

        var arg = bufs[f].slice(offset, offset += len);
        args[a] = arg;

        //preview('decode', 'arg', arg);

      }
      
      // if NAMESPACE.
      if ( flag === 12 ) {
        var name = args[0].toString();
        args.shift();
        return { flag: 12, description: 'namespace', name: name, args: args };
      }

      
      var description = flags.flags.filter(function(_flag) {
        return _flag.flag == flag;
      })[0].description.toLowerCase();
            
            
      if ( flag === 0 ) {      
        return { flag: flag, description: description, sequence_number: sequence_number, args: args };
      } else {
        return { flag: flag, description: description, args: args };
      }

    }

    // CODE 1 or 2, FRAME:

    //var id = bufs[f].readUInt16BE(offset);
    var id = (bufs[f][offset] << 8) + (bufs[f][offset++]);    // equivalent to readUInt16BE.
    //preview('decode', 'id: ' + id);
    
    //offset+=2;

    //var framex = bufs[f].readUInt32BE(offset);
    var framex = (bufs[f][offset] << 24) + (bufs[f][offset++] << 16) + (bufs[f][offset++] << 8) + (bufs[f][offset++]);    // equivalent to readUInt32BE.
    //preview('decode', 'framex: ' + framex);

    //offset += 4;

    // unpack args
    for (var a = 0; a < argc; a++) {
    
      //preview('decode', 'a: ' + a);
    
      //var len = bufs[f].readUInt16BE(offset);
      var len = (bufs[f][offset++] << 8) + (bufs[f][offset++]);   // equivalent to readUInt16BE.
      
      //preview('len: ' + len);
      
      offset += 2;

      var arg = bufs[f].slice(offset, offset += len);
      args[a] = arg;
      
      //preview('decode', 'arg', arg);

    }

    //preview('decode', 'frames.push f: ' + f + ' args', args);
    
    var description = flags.flags.filter(function(_flag) {
      return _code.code == code;
    })[0].description.toLowerCase();    
    
    frames.push({ flag: flag, description: description, sequence_number: sequence_number, id: id, framex: framex, args: args });

  }

  return frames;

};



Message.prototype.decodeStream = function (flag, sn, ids, args) {

  //console.log('decodeStream', 'flag: ' + flag);
  //console.log('decodeStream', 'args: ' + args);
  
  var description = flags.flags.filter(function(_flag) {
    return _flag.flag == flag;
  })[0].description.toLowerCase();  
  
  // whole MESSAGE.
  if ( flag === 0 ) {
    //return { flag: flag, description: description, sequence_number: sn.readUInt32BE(0), args: args };
     return { flag: flag, description: description, args: args };
  }
  
  // Super
  if ( flag === 14 ) {
    return { flag: 14, description: 'super', meta: args[0], schema: args[1], payload: args[2] };
  }  
  
  // whole MESSAGE or non payload message.
  if ( flag != 1 && flag != 2 && flag != 3 ) {
    return { flag: flag, description: description, args: args };
  }
  
  
  
  // TODO: other mesg types, info, row, block etc
  
  // TODO: change readUInt32BE to faster bitwise
  
  // FRAME.
  return { flag: flag, description: description, sequence_number: sn.readUInt32BE(0), id: ids.readUInt16BE(0), framex: ids.readUInt32BE(2), args: args };

};



Message.prototype.flagDescription = function (flag) {

  var description = flags.flags.filter(function(_flag) {
    return _flag.flag == flag;
  })[0].description.toLowerCase();  
  
  // FRAME.
  return description;

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

  if ( frames[0].flag != 1 && frames[0].flag != 2 && frames[0].flag != 3 ) {
    return frames;    // already a message!
  }

  // order frames by FRAME#
  frames.sort(function(fx1, fx2) {
    return fx1.framex - fx2.framex;
  });
  
  for ( var f = 0; f < frames.length; f++ ) {

    //console.log('toMessage', 'bufs f: ' + f + ' bufs[f]', frames[f]); 
    
    var flag = frames[f].flag;
    //preview('toMessage', 'flag: ' + flag);

    var argc = frames[f].args.length;
    //console.log('toMessage', 'argc: ' + argc);
    var args = new Array(argc);

    var _id = frames[f].id;
    //preview('toMessage', '_id: ' + _id);
    
    if ( id === undefined ) {
      id = _id;   // use first inputed ID.
    }
    
    if ( id === _id ) {
      if ( flag === 3 ) {
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

  var errMessage = errors.errors.filter(function(flag) {
    return flag.flag == errCode;
  })[0].message;  

  //preview('errMessage', errMessage);
  
  if ( args === undefined ) {
    args = new Array(0);
  }
  
  var _args = [new Buffer(errCode.toString()), new Buffer(errMessage)].concat(args);
  //preview('_args', _args);  

  return infos(_args, 5);   // FLAG 5: ERROR
  
};



// HEARTBEAT (FLAG 6) Message
Message.prototype.heartbeat = function (args) {
  if ( args === undefined ) args = new Array(0);
  return infos(args, 6);    // FLAG 6: HEARTBEAT
};



// STOP (FLAG 7) Message
Message.prototype.stop = function (args) {
  if ( args === undefined ) args = new Array(0);
  return infos(args, 7);    // FLAG 7: STOP
};



// PAUSE (FLAG 8) Message
Message.prototype.pause = function (args) {
  if ( args === undefined ) args = new Array(0);
  return infos(args, 8);    // FLAG 8: PAUSE
};



// RESUME (FLAG 9) Message
Message.prototype.resume = function (args) {
  if ( args === undefined ) args = new Array(0);
  return infos(args, 9);    // FLAG 9: RESUME
};



// CHECKPOINT (FLAG 10) Message
Message.prototype.checkpoint = function (args) {
  if ( args === undefined ) args = new Array(0);
  return infos(args, 10);    // FLAG 10: CHECKPOINT
};



// NAMESPACE (FLAG 11) Message
Message.prototype.namespace = function (name, args) {
  
  //console.log('name', name);
  //console.log('args', args);
  
  if ( args === undefined ) args = new Array(0);
  
  // set name as first argument.
  args.unshift(new Buffer(name.toString()));

  //console.log('args', args);
  
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

  // pack meta: FLAG/ARGC
  buf[offset] = 12 << 4 | argc;
  
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
  
};


// BLOCK (FLAG 12) Message
Message.prototype.block = function (meta, checksum, sn, segment, schema_id, block_length) {
  
	//+---------------------------------------------------------------------------------------+---------------------------------+---------+
	//| BLOCK Protocol                                                                        | Optional                        |         |
	//+--------+----------------+------------+-----------------+---------+-----------+--------+----------------+----------------+---------+
	//|        | FLAG 12 & META | CHECKSUM   | SEQUENCE NUMBER | SEGMENT | SCHEMA ID | LENGTH | *TS            | *HR            | PAYLOAD |
	//+--------+----------------+------------+-----------------+---------+-----------+--------+----------------+----------------+---------+
	//| OCTETS | 0              | 1, 2, 3, 4 | 5, 6, 7, 8      | 9, 10   | 11, 12    | 13, 14 | 15, 16, 17, 18 | 19, 20, 21, 22 | 23, 24  |
	//+--------+----------------+------------+-----------------+---------+-----------+--------+----------------+----------------+---------+
  //| * Optional (both) if META = 2, 3, 6, 7, 10 or 11 add TS = Timestamp, HR = High resolution time.                                   |
  //+-----------------------------------------------------------------------------------------------------------------------------------+

  if ( checksum == undefined ) {
    checksum = 0; 
  }

  if ( meta == undefined ) {
    meta = 0;    // default.
  }
  
  if ( sn == undefined ) {
    sn = 0;
  }

  if ( segment == undefined ) {
    segment = 0;
  }

  if ( schema_id == undefined ) {
    schema_id = 0;    // 0 means no schema set.
  }
  
  if ( block_length == undefined ) {
    block_length = 0;
  }  

  // events_size = array of events concat size in bytes.
  var len = 15;    // block protocol length

  if ( meta === 2 || meta === 3 || meta === 6 || meta === 7 || meta === 10 || meta === 11 ) {
    len += 8;   // if 'optional' add TS and HR.
  }

  var buf = new Buffer(len);

  var offset = 0;  

  // pack meta: FLAG & META as nibbles.
  buf[offset++] = 12 << 4 | meta;
  
  // CHECKSUM (EG: CRC-32C),  (UInt32BE):
  buf[offset++] = checksum >>> 24 & 0xff;
  buf[offset++] = checksum >>> 16 & 0xff;
  buf[offset++] = checksum >>> 8 & 0xff;
  buf[offset++] = checksum & 0xff;   
  
  // SEQUENCE NUMBER (UInt32BE):
  //if ( Buffer.isBuffer(sn) ) {
  //	buf[offset++] = sn[0];
  //	buf[offset++] = sn[1];
  //	buf[offset++] = sn[2];
  //	buf[offset++] = sn[3];
  //} else {
		buf[offset++] = sn >>> 24 & 0xff;
		buf[offset++] = sn >>> 16 & 0xff;
		buf[offset++] = sn >>> 8 & 0xff;
		buf[offset++] = sn & 0xff;
 //}

	// SEGMENT
  buf[offset++] = segment >>> 8 & 0xff;
 	buf[offset++] = segment & 0xff;   

  // SCHEMA ID (UInt16BE):
  //if ( Buffer.isBuffer(schema_id) ) {
  //	buf[offset++] = schema_id[0];
  //	buf[offset++] = schema_id[1]; 
  //} else {
  	buf[offset++] = schema_id >>> 8 & 0xff;
  	buf[offset++] = schema_id & 0xff;   
  //}
  
  // BLOCK LENGTH size of array of events in bytes (UInt16BE):
  buf[offset++] = block_length >>> 8 & 0xff;
  buf[offset++] = block_length & 0xff; 
  
  if ( meta === 2 || meta === 3 || meta === 6 || meta === 7 || meta === 10 || meta === 11 ) {

    var ts = Math.floor(Date.now() / 1000);  // unix timestamp.
    var hr = process.hrtime()[1];   // high resolution time.

    // TS (timestamp), (UInt32BE):
    buf[offset++] = ts >>> 24 & 0xff;
  	buf[offset++] = ts >>> 16 & 0xff;
    buf[offset++] = ts >>> 8 & 0xff;
    buf[offset++] = ts & 0xff; 

    // HR (high resolution time), (UInt32BE):
    buf[offset++] = hr >>> 24 & 0xff;
  	buf[offset++] = hr >>> 16 & 0xff;
    buf[offset++] = hr >>> 8 & 0xff;
    buf[offset++] = hr & 0xff; 
    
  }

  return [buf];   // returns array wrapper to make same as frames return.
  
};


// ROW (FLAG 13) Message
Message.prototype.row = function (meta, checksum, sn, _row) {

	//+-----------------------------------------------------------------+
	//| ROW Protocol                                                    |
	//+--------+----------------+------------+-----------------+--------+
	//|        | FLAG 13 & META | CHECKSUM   | SEQUENCE NUMBER | LENGTH |
	//+--------+----------------+------------+-----------------+--------+
	//| OCTETS | 0              | 1, 2, 3, 4 | 5, 6, 7, 8      | 9, 10  |
	//+--------+----------------+------------+-----------------+--------+

  if ( checksum == undefined ) {
    checksum = 0; 
  }

  if ( meta == undefined ) {
    meta = 0;    // default.
  }
  
  if ( sn == undefined ) {
    sn = 0;
  }
  
  let row_length = _row.length;

  // events_size = array of events concat size in bytes.
  let len = 11;    // block protocol length
  let offset = 0;  

  //preview('len: ' + len);
  // message buffer
  let buf = new Buffer(len);

  // pack meta: FLAG & META as nibbles.
  buf[offset++] = 13 << 4 | meta;
  
  // CHECKSUM (EG: CRC-32C)
  buf[offset++] = checksum >>> 24 & 0xff;
  buf[offset++] = checksum >>> 16 & 0xff;
  buf[offset++] = checksum >>> 8 & 0xff;
  buf[offset++] = checksum & 0xff;   
  
  // SEQUENCE NUMBER (UInt32BE):
  buf[offset++] = sn >>> 24 & 0xff;
  buf[offset++] = sn >>> 16 & 0xff;
  buf[offset++] = sn >>> 8 & 0xff;
  buf[offset++] = sn & 0xff;
  
  // ROW LENGTH size of array of events in bytes (UInt16BE):
  buf[offset++] = row_length >>> 8 & 0xff;
  buf[offset++] = row_length & 0xff; 
  
  return Buffer.concat([buf, _row], buf.length + row_length);
  
};



// SUPER (FLAG 14) Protocol
Message.prototype.super = function (meta, payload, schemaURL, ident) {

	//+--------------------------------------------------------------------------------------+
	//| SUPER Protocol                                                                       |
	//+--------------------------+-------------------+-------------------+-------------------+
  //|                          | ARG[0]: META      | ARG[1]: SCHEMA   | ARG[2]: PAYLOAD    |
  //+--------+-----------------+--------+----------+--------+----------+--------+----------+
	//|        | FLAG 14 & IDENT | LENGTH | PAYLOAD  | LENGTH | PAYLOAD  | LENGTH | PAYLOAD  |
	//+--------+-----------------+--------+----------+--------+----------+--------+----------+
	//| OCTETS | 0               | 1, 2   | <LENGHT> | ., .   | <LENGHT> | ., .   | <LENGHT> |
	//+--------+-----------------+--------+----------+--------+----------+--------+----------+
  //| See: http://smprotocol.github.io#super                                               |
  //+--------------------------------------------------------------------------------------+
  
  // NOTES: About Super Protocol,
	// A higher-level protocol. Has 3 fixed arguments, all are Buffers: 
	//  - arg[0] = Buffer, meta about message.
	//  - arg[1] = Buffer, protocol schema URL.
	//  - arg[2] = Buffer, payload data.
	// ident: integer, between 0:15, default: 0, can be used to define the Super Protocol Version.

	if ( schemaURL == undefined ) schemaURL = '';		// protocol schema URL.

  if ( ident == undefined ) ident = 0;		// protocol version
  var len = 0;
  var offset = 0;

  len += meta.length; 
	len += schemaURL.length;  
  len += payload.length;   
	
  len += (3 * 2) + 1;		// 3 args * 2 bytes length + flag/ident
  //preview('len: ' + len);
  // message buffer
  var buf = new Buffer(len);

  // pack: FLAG/IDENT
  buf[offset++] = 14 << 4 | ident;
  
  // meta
	buf[offset++] = meta.length >>> 8 & 0xff;
  buf[offset++] = meta.length & 0xff; 

  meta.copy(buf, offset);
  offset += meta.length;

	// schemaURL
	buf[offset++] = schemaURL.length >>> 8 & 0xff;
  buf[offset++] = schemaURL.length & 0xff; 

  schemaURL.copy(buf, offset);
  offset += schemaURL.length;	
  
  // payload
	buf[offset++] = payload.length >>> 8 & 0xff;
  buf[offset++] = payload.length & 0xff; 

  payload.copy(buf, offset);
  offset += payload.length;
	
  return buf;
  
};



// decode BLOCK buffer.
function _decodeBlock(version, buf) {

	var offset = 1;		// already at 1 byte as have flag and version.

	var checksum = ((buf[offset++] << 24)  + (buf[offset++] << 16) + (buf[offset++] << 8) + (buf[offset++])) >>> 0;    // equivalent to readUInt32BE.

	var sn = ((buf[offset++] << 24) + (buf[offset++] << 16) + (buf[offset++] << 8) + (buf[offset++])) >>> 0;    // equivalent to readUInt32BE.
	
	// TODO: change from 32 bit to 16!
	//var block_length = (buf[offset++] << 8) + (buf[offset++]);    // equivalent to readUInt16BE.
  var block_length = ((buf[offset++] << 24) + (buf[offset++] << 16) + (buf[offset++] << 8) + (buf[offset++])) >>> 0;    // equivalent to readUInt32BE.
  
  //var items = ((buf[offset++] << 8) + (buf[offset++])) >>> 0;    // equivalent to readUInt16BE.
  
	return { flag: 13, description: 'block', version: version, checksum: checksum, sequence_number: sn, length: block_length };    

}



// non MESSAGE/FRAME.
function infos(args, flag) {
  
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

  // pack meta: FLAG/ARGC
  buf[offset] = flag << 4 | argc;
  
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

