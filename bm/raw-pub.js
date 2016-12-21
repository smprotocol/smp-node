
var net = require('net');
var buffer = new Buffer(1024 * 1024);

var overflow = true;

function write(socket) {
  if (!socket.writable) return;

	if ( !socket.isPaused() ) {
 	 	
 	 	socket.write(buffer, function() {
 	  	overflow = write(socket);
 	  	if ( !overflow ) {
				socket.pause();
			}	
		});
		
  }
}

var server = net.createServer(function(socket) {

	socket.on('drain', function() {
  	socket.resume();
	});		
	
  server.close();
  write(socket);
  
 
});

server.listen(8555, function() {

});
