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

function newfetch(category, post) {
  var root = path.join(__dirname, category, post);
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

      metaData.body = articleWindow.document.getElementById('body');

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

function fetch(category, post, callback) {
  setTimeout(function () {
    var root = path.join(__dirname, category, post);

    if (reserved(category) || reserved(post)) {
      callback(null);
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
                  }
                });
                callback(window);
              });
            });
          });
        });
      } else {
        callback(null);
      }
    });
  }, 0);
}

function preview(category, post, callback) {
  setTimeout(function () {
    var root = path.join(__dirname, category, post);

    if (reserved(category) || reserved(post)) {
      callback(null);
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

                data.body = articleWindow.document.getElementById('preview');

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
                callback(window);
              });
            });
          });
        });
      } else {
        callback(null);
      }
    });
  }, 0);
}

function list(category, callback) {
  setTimeout(function () {
    var root = path.join(__dirname, category);
    if (reserved(category)) {
      callback(null);
    }

    fs.exists(root, function (exists) {
      if (exists) {
        
      } else {
        callback(null);
      }
    });
  }, 0);
}


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
/*  fetch(req.params.category, req.params.post, function (postWindow) {
    if (postWindow) {
      res.send(postWindow.document.innerHTML);
    } else {
      next();
    }
  });*/

  newfetch(req.params.category, req.params.post).then(
    function (postWindow) {
      res.send(postWindow.document.innerHTML);
    },
    function (error) {
      next();
    });
});

function reserved(filename) {
  var reserved = ['static', 'base.html'];

  return reserved.indexOf(filename) != -1;
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

app.fetch = fetch;
app.preview = preview;
app.list = list;
