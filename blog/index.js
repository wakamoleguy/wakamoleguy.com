var express = require('express');
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var weld = require('weld');
var when = require('when');

var app = module.exports = express();

function fsexists(path) {
  var deferred = when.defer();
  fs.exists(path, function (exists) {
    if (exists)
      deferred.resolve();
    else
      deferred.reject();
  });
  return deferred.promise;
}

function fsread(path) {
  var deferred = when.defer();
  fs.readFile(path, 'utf-8', function (err, data) {
    if (!err)
      deferred.resolve(data);
    else
      deferred.reject(err);
  });
  return deferred.promise;
}

function fsls(path) {
  var deferred = when.defer();
  fs.readdir(path, function (err, files) {
    if (!err) {
      deferred.resolve(files);
    } else {
      deferred.reject(err);
    }
  });
  return deferred.promise;
}

function jsdomenv(path) {
  var deferred = when.defer();
  jsdom.env(path, function (err, window) {
    if (!err) {
      deferred.resolve(window);
    } else {
      deferred.reject(err);
    }
  });
  return deferred.promise;
}


function checkReserved(word) {
  var reserved = ['static', 'base.html', 'meta.json', 'article.html'];

  var deferred = when.defer();
  if (reserved.indexOf(word) === -1) {
    deferred.resolve();
  } else {
    deferred.reject(word + ' is reserved');
  }
  return deferred.promise;
}

function getListFile(category) {
  var catBase = path.join(__dirname, category, 'list.html');

  return fsexists(catBase).then(function () {
    return catBase;
  }, function () {
    return path.join(__dirname, 'list.html');
  });
}

function getBaseFile(category, post) {
  var catBase = path.join(__dirname, category, 'base.html');
  var postBase = path.join(__dirname, category, post, 'base.html');

  return fsexists(postBase).then(function () {
    return postBase;
  }, function () {
    return fsexists(catBase).then(function () {
      return catBase;
    }, function () {
      return path.join(__dirname, 'base.html');
    });
  });
}


function fetch(category, post, part) {
  var root = path.join(__dirname, category, post);
  part || (part = 'body');

  return when.all([checkReserved(category), checkReserved(post)]).
    then(function () {
      return fsexists(root);
    }).then(function () {
      return getBaseFile(category, post);
    }).then(function (base) {
      return when.all([
        jsdomenv(base),
        jsdomenv(path.join(root, 'article.html')),
        fsread(path.join(root, 'meta.json'))]);
    }).then(function (resolutions) {
      var baseWindow = resolutions[0],
          articleWindow = resolutions[1],
          metaData = JSON.parse(resolutions[2]);

      metaData.body = articleWindow.document.getElementById(part);

      weld.weld(baseWindow.document.documentElement, metaData, {
        /* HACK - Insert meta data into <meta> tags
           This overrides some potentially useful features
           in the main weld library for sake of simplicity here.
         */
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
      return baseWindow;
    });
}

function preview(category, post) {
  return fetch(category, post, 'preview');
}

function list(category) {
  var root = path.join(__dirname, category);

  return when.all([checkReserved(category), fsexists(root)]).
    then(function () {
      return fsls(root);

    }).then(function (posts) {
      var promises = [];
      for (var i = 0, l = posts.length; i < l; i++) {
        promises.push(preview(category, posts[i]));
      }

      return when.settle(promises);
    }).then(function (descriptors) {
      var fulfilled = [];
      descriptors.forEach(function(d) {
        if (d.state === 'fulfilled') {
          fulfilled.push(d.value.document.querySelector('article').innerHTML);
        }
      });

      // Do `then` before returning, since we need access to fulfilled
      return getListFile(category).
        then(function (listFile) {
          return jsdomenv(listFile);
        }).then(function (baseWindow) {
          var target = baseWindow.document.getElementsByTagName('main')[0];
          fulfilled.forEach(function (preview) {
            var p = baseWindow.document.createElement('article');
            p.innerHTML = preview;
            target.appendChild(p);
          });
          return baseWindow;
        });
    });
}

app.get('/:category', function (req, res, next) {
  list(req.params.category).then(
    function (listWindow) {
      res.send(listWindow.document.innerHTML);
    },
    function (error) {
      next();
    });
});

app.get('/:category/:post', function (req, res, next) {
  fetch(req.params.category, req.params.post).then(
    function (postWindow) {
      res.send(postWindow.document.innerHTML);
    },
    function (error) {
      next();
    });
});

app.fetch = fetch;
app.preview = preview;
app.list = list;
