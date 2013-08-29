var express = require('express');
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var weld = require('weld');

var app = module.exports = express();

app.get('/:category', function (req, res, next) {
  var category = req.params.category;
  if (reserved(category)) {
    next();
  }

  fs.exists(path.join(__dirname, category), function (exists) {
    if (exists) {
      getListFile(category, function (base) {
        res.send('This is where the list for ' + category + ' would go.');
      });
    } else {
      next();
    }
  });
});

app.get('/:category/:post', function (req, res, next) {
  var category = req.params.category,
      post = req.params.post,
      root = path.join(__dirname, category, post);

  if (reserved(category) || reserved(post)) {
    next();
  }

  fs.exists(root, function (exists) {
    if (exists) {
      getBaseFile(category, post, function (base) {
        jsdom.env(base, function (errors, window) {
          if (errors) throw errors;

          fs.readFile(path.join(root, 'meta.json'), function (err, data) {
            if (err) throw err;

            data = JSON.parse(data);

            jsdom.env(path.join(root, 'article.html'), function (errors, articleWindow) {
              if (err) throw err;

              data.body = articleWindow.document.getElementById('body');

              weld.weld(window.document.documentElement, data, {
                set: function (parent, element, key, value) {
                  if (value && value.nodeType) {
                    if (element.ownerDocument !== value.ownerDocument) {
                      value = element.ownerDocument.importNode(value, true);
                    } else if (value.parentNode) {
                      value.parentNode.removeChild(value);
                    }

                    while (element.firstChild) {
                      element.removeChild(element.firstChild);
                    }

                    element.appendChild(value);

                  } else if (element.nodeName === 'META') {
                    element.setAttribute('content', value);
                  } else {
                    element.textContent = value;
                  }
                  return true;
                }
              });
              res.send(window.document.innerHTML);
            });
          });
        });
      });
    } else {
      next();
    }
  });

});

function reserved(filename) {
  var reserved = ['static', 'base.html'];

  return reserved.indexOf(filename) != -1;
}

function getListFile(category, callback) {
  var root = path.join(__dirname, category);

  function tryList(root, success, error) {
    fs.exists(path.join(root, 'list.html'), function (exists) {
      if (exists) {
        success(path.join(root, 'list.html'));
      } else {
        error();
      }
    });
  }

  tryList(path.join(__dirname, category), callback, function () {
    callback(path.join(__dirname, 'list.html'));
  });
}

function getBaseFile(category, post, callback) {
  function tryBase(root, success, error) {
    fs.exists(path.join(root, 'base.html'), function (exists) {
      if (exists) {
        success(path.join(root, 'base.html'));
      } else {
        error();
      }
    });
  }

  tryBase(path.join(__dirname, category, post), callback, function () {
    tryBase(path.join(__dirname, category), callback, function () {
      callback(path.join(__dirname, 'base.html'));
    });
  });
}
