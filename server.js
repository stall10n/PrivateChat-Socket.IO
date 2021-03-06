var http = require('http'),
    fs = require('fs'),
	path = require('path'),
	sio = require('socket.io');  

var app = http.createServer(function(req, res) {
	var filePath = '.' + req.url;
	if (filePath == './')
		filePath = './index.html';
	
	var extname = path.extname(filePath);
	var contentType = 'text/html';
	switch (extname) {
		case '.js':
			contentType = 'text/javascript';
			break;
		case '.css':
			contentType = 'text/css';
			break;
	}
	
	path.exists(filePath, function(exists) {
	
		if (exists) {
			fs.readFile(filePath, function(error, content) {
				if (error) {
					res.writeHead(500);
					res.end();
				}
				else {
					res.writeHead(200, { 'Content-Type': contentType });
					res.end(content, 'utf-8');
				}
			});
		}
		else {
			res.writeHead(404);
			res.end();
		}
	});	
});


app.listen(process.env.PORT, function () {
  var addr = app.address();
  console.log('app listening on http://' + addr.address + ':' + addr.port);
});

// Socket.io server listens to our app
var io = sio.listen(app);


// Connected user list
var users = {};
// Socket infos of connected users 
var sockets = {};

// Emit welcome message on connection
io.sockets.on('connection', function(socket) {
	console.log("geldi3");	
	socket.on("newUser" , function(username) {
		socket.username = username;		
		socket.userId = users.length;
		
		users[username] = {
			username : username,
			userId : users.length
		};
			
		sockets[username] = socket;

		// Send only the connected user
		socket.emit("sendMessage" , "System" , "Welcome...");
			
		// Send message all users except the last connected user
		socket.broadcast.emit("sendMessage", "System" , username + " is connected");
					
		io.sockets.emit("refreshUsers" , users);
		
	});

	socket.on('disconnect', function(){		        
        // Broadcast disconnected users name
        socket.broadcast.emit("sendMessage", "System", socket.username + " is disconnected :(");
		
		delete sockets[socket.username];		
		delete users[socket.username]; 
		
        // Send connected user list to the connected user
        io.sockets.emit("refreshUsers", users);
    });	
	
	
    socket.on("sendMessage", function(nickname, data){        
		socket.broadcast.emit("sendMessage", nickname, data);
    });
	
	socket.on("privateMessage" , function(data) {
		sockets[data.to].emit("privateMessage", data.from, data.msg);		
	});
	
	socket.on("updateStatus" , function(data) 
	{
		if(data.msg === '[[[SEEN]]]')
		{
			sockets[data.to].emit("updateStatus", data.from, "Seen at: " + new Date().toUTCString());	
		} else {
			sockets[data.to].emit("updateStatus", data.from, data.msg);	
		}
	});
}); 