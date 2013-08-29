var express = require('express');
//var api = require('./api');
//var client = require('./client');
var blog = require('./blog');

var app = express();

app.use(express.logger());

//app.use('/api', api);
//app.use(client);

app.use(blog);

app.use(express.static(__dirname + '/static'));

app.all('*', function (req, res) {
  res.writeHeader(404, {"Content-Type": 'text/plain'});
  res.write('Page not found.');
  res.end();
});

var port = process.env.PORT || 10080;
app.listen(port, function () {
  console.log('Listening on port ' + port);
});
