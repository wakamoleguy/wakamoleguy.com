var express = require('express');
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var weld = require('weld');

var app = module.exports = express();

function generate(path) {
  
}

app.get('*', function (req, res, next) {
  var path = req.path;
  var page;
  console.log(path);

  try {
    page = require('./pages' + path);
    console.log('module found');
  } catch (e) {
    console.log('no module');
    next();
  }
});