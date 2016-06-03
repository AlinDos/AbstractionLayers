// Task # 5 Dependencies ------------------------------------------------------
var http = require('http'),
    fs = require('fs');

// Task # 6 Configure ---------------------------------------------------------
const configure = {
  PORT: 8080,
  HOST: '127.0.0.1'
}

// ----------------------------------------------------------------------------
// Cache
var cache = {};
// Cookies
var cookies;

// Task #1 Data access --------------------------------------------------------
var person = {
  read: function(callback) {
    fs.readFile('./person.json', (err, data) => {
      if (err) { callback(err, undefined); return; }
      callback(err, setData(data));
    });    
  },
  write: function(data, callback) {
    var types = {
      object:    function(obj) { if (obj.name) obj.name = obj.name.trim();  
                                 return JSON.stringify(obj); },
      string:    function(s) { return object(JSON.parse(s)); },
      undefined: function() { return callback("error");}
    };
    fs.writeFile('./person.json', types[typeof(data)](data), callback);
  }
};

// Task #3.5 Routing ----------------------------------------------------------
var routing = { 
  '/' : 
    {
      'GET': function(req, res) {
        res.writeHead(200, {
          'Set-Cookie': 'mycookie=mytest',
          'Content-Type': 'text/html'
        });
        var ip = req.connection.remoteAddress;
        res.write('<h1>Welcome</h1>' + 
                  '<div>Your IP: ' + ip + '</div>');
        res.end('<pre>' + JSON.stringify(cookies) + '</pre>'); 
      }
    },
 '/person': 
    {
      'GET': function(req, res) {
        person.read( (err, obj) => {
          if (err) { sendRes(res, 500, 'Read error'); return; }
          
          var data = JSON.stringify(obj);
          cache[req.url] = data;
          sendRes(res, 200, data);
        }); 
      }, 
      'POST': function(req, res) {
        concatBuffer(req, function(data) {
          var obj = JSON.parse(data);
          cache[req.url] = data;
          person.write(obj, (err) => {
            if (err) sendRes(res, 500, 'Write error');
            else sendRes(res, 200, 'File saved');
          });
        });
      }
    }
};

// Task #3.2 Parse cookies ----------------------------------------------------
function parseCookies (req) {
  var cookie = req.headers.cookie,
      cookies = {};
  if (cookie) cookie.split(';').forEach((item) => {
    var parts = item.split('=');
    cookies[(parts[0]).trim()] = (parts[1] || '').trim();
  });
  return cookies;
}

// Task #3.3 Buffer uniting ---------------------------------------------------
function concatBuffer(req, callback) {
  var body = [];
  req.on('data', (chunk) => { body.push(chunk); }).on('end', () => {
    var data = Buffer.concat(body).toString();
    callback(data);
  });
}

// ----------------------------------------------------------------------------
function sendRes(res, status, result) {
    res.writeHead(status);
    res.end(result);
}

// Task #3.4 Logging ----------------------------------------------------------
function log(req) {
  var date = new Date().toISOString();
  console.log([date, req.method, req.url].join('  '));
}

// Task #4 Business logic ----------------------------------------------------
function setData(data) {
  var obj = JSON.parse(data);
  obj.birth = new Date(obj.birth);
  obj.age = Math.floor((new Date() - obj.birth) / 31536000000);
  delete obj.birth;
  return obj;
}

// ----------------------------------------------------------------------------
// Create HTTP Server ---------------------------------------------------------
var server = http.createServer ((req, res) => {
  
  // Parse cookies
  cookies = parseCookies(req);
    
  // Logging
  log(req);

  // Serve from cache
  if (cache[req.url] && req.method === 'GET') {
    sendRes(res, 200, cache[req.url]);
  } 
  // Routing
  else {
    try {
      routing[req.url][req.method](req, res);  
    } catch (err) {
      sendRes(res, 404, 'Path not found');
    }
  }
});

server.listen (configure.PORT, configure.HOST);