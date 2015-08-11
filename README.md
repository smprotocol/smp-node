# Streaming Message Protocol for Node.js [![Build Status](https://api.travis-ci.org/smprotocol/smp-node.png)](https://travis-ci.org/smprotocol/smp-node)

Streaming Message Protocol for Node.js.  

The Streaming Message Protocol (SMP) is a lightweight and efficient data framing protocol for 
exchanging messages across network transports like: TCP, TLS, WebSocket. 

_To read the [Streaming Message Protocol Specification](http://smprotocol.github.io/)._

SMP is a binary protocol allowing any binary data format to be used. You can of cause use non 
binary data such as text, JSON - by converting to a buffer. You can also encode multiple arguments 
within a single message, for example: binary from a photo and JSON about that photo, as separate 
arguments. This means you don't have to use serialization to combine binary and text based data
together into a single argument.

SMP solves three data scenarios when sending messages across a network:

1. A whole small message.
2. A large whole message, called frames.
3. A never ending message, also frames.

SMP makes frames of large or never ending messages efficiently sized to best fit over the network, 
frames are assigned a unique ID and order number. This approach allows asynchronously sent frames - 
you could even send frames to different receivers, to be reassembled later.


## Installation

```
npm install smp
```


## Example

_See examples folder. To print use preview, eg: node examples/message.js --preview_

```js
var smp = require('smp');

var framed = smp.encode([new Buffer('hello world')]);
console.log('framed', framed);    // <Buffer 01 00 0b 68 65 6c 6c 6f 20 77 6f 72 6c 64>

var message = smp.decode(framed.toBuffer());
console.log('message', message);

var payload = message.args[0].toString();
console.log('payload:', payload);

```
Stream through TCP.

```js
var net = require('net');
var smp = require('smp');

var server = net.createServer(function(sock){

  var stream = smp.StreamParser;
  var parser = new stream();

  // can use parser.on( 'frame', 'message', 'err', 'errorMessage', 'information', etc.

  parser.on('frame', function(frame){
    console.log('frame', frame);
  });

  sock.pipe(parser);
  
});

server.listen(8888);

var client = net.connect(8888);
client.write(smp.encode([new Buffer('abcdefghijklmnopqrstuvwxyz'), new Buffer('0123456789')], {max_message_size: 10, id: 555, first: true}).toBuffer());

```


## Options

Encode options.
```
 max_message_size: number,   // byte size of a whole message, if greater will be frames of.
               id: number,   // can set a ID for frames.
            first: boolean,  // if true and frames, frame[0] will be first frame (CODE:1).
         complete: boolean,  // if true and frames, frame[frames.length] will be last frame (CODE:3).
          toFrame: boolean   // if true will be frame even when size less than max_message_size.
```


## Thanks

Thanks to [TJ Holowaychuk](https://github.com/tj/node-amp) for inspiration of multiple arguments within a message.


## License

Choose either: [MIT](http://opensource.org/licenses/MIT) or [Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0).
