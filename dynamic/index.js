var express = require('express');
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var weld = require('weld');
var when = require('when');

var app = module.exports = express();

function generate(page) {
  var deferred = when.defer();
  console.log('page: ' + path.join(__dirname, 'pages', page, 'index.html'));
  console.log('meta: ' + './meta/' + page);
  jsdom.env(path.join(__dirname, 'pages', page, 'index.html'), function (err, window) {
    if (err) {
      deferred.reject(err);
    } else {
      require('./meta/' + page).getMetaData().then(function (metaData) {
        console.log('generate callback');
        console.log('\n\n\n', window.document.documentElement, '\n\n\n');
        console.log(metaData, '\n\n\n');
        weld.weld(window.document.documentElement, metaData);
        console.log('meta data welded');
        console.log(window);
        deferred.resolve(window);
      }, function (err) {
        console.log('generate error callback');
      });
    }
  });

  return deferred.promise;
}

app.get('*', function (req, res, next) {
  var page = req.path;
  var page;
  console.log(page);
  console.log(path.join(__dirname, 'pages', page, 'index.html'));
  console.log(path.join(__dirname, 'meta', page, 'index.js'));


  fs.exists(path.join(__dirname, 'pages', page, 'index.html'), function (exists) {
    if (exists) {
      fs.exists(path.join(__dirname, 'meta', page, 'index.js'), function (exists) {
        if (exists) {
          generate(page).then(
            function (window) {
              console.log('generate page success');
              res.send(window.document.outerHTML);
            },
            function (err) {
              console.log('generate page failure');
              console.log('error: ', err);
              next();
            });
        } else {
          next();
        }
      });
    } else {
      next();
    }
  });
});