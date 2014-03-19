var express = require('express');
var app = express();
var Path = require('path');
var fs = require('fs');
var jsdom = require('jsdom');
var when = require('when');

app.use(express.logger());


// API to come later
app.use('/api', require('./api'));

// Weld rendering
/*app.use(function (req, res, next) {
  var path = req.path;

  if (path.indexOf('.') !== -1) return next();

  var absolutePath = Path.join(__dirname, 'htdocs', req.path, 'index.html');

  readHTML(absolutePath).then(
    function (window) {
      embed(window.document).then(
        function (document) {
          res.send(document.outerHTML);
        }
      );
    },
    function (err) {
      console.log('error generating page: ', err);
      next();
    }
  );
});*/


// Static files
app.post(express.static(__dirname + '/htdocs'));
app.use(express.static(__dirname + '/htdocs'));

// Catch-all 404
app.all('*', function (req, res) {
  res.writeHeader(404, {"Content-Type": 'text/plain'});
  res.write('Page not found.');
  res.end();
});

// Run the server
var port = process.env.PORT || 10080;
app.listen(port, function () {
  console.log('Listening on port ' + port);
});





/**** Helper function ****/


/*
 * Read html file into a jsdom object
 *
 * @param path - path to the file
 * @returns - promise of a window
 */
function readHTML(path) {
  var deferred = when.defer();
  console.log('reading html: ', path);
  fs.readFile(path, 'UTF-8', function (err, data) {
    if (err) {
      console.log('file read failed: ', path, err);
      deferred.reject(err);
    } else {
      jsdom.env(data, function (err, window) {
        if (err) {
          console.log('jsdom failed: ', path);
          deferred.reject(err);
        } else {
          console.log('got window: ', path);
          deferred.resolve(window);
        }
      });
    }
  });

  return deferred.promise;
}

/*
 * Promise version of fs.readdir
 */
function fsls(path) {
  var deferred = when.defer();

  fs.readdir(path, function (err, files) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(files);
    }
  });

  return deferred.promise;
}

/*
 * resolve possible wildcard path to list of paths
 */
function resolvePath(relativePath) {
  var path = Path.join(__dirname, 'htdocs', relativePath);
  if (path.indexOf('*') !== -1) {
    console.log('resolving path with *: ', path);
    path = path.replace('*', '');
    return fsls(path).then(function (relPaths) {
      var absPaths = [];
      relPaths.forEach(function (r) {
        absPaths.push(Path.join(path, r));
      });
      return absPaths;
    });;
  } else {
    console.log('resolving path with no *: ', path);
    return when.resolve([path]);
  }
}

function weld(target, embeddable) {
}

/*
 * Embed dom window based on <embed> tag sources
 * @param document - the dom to embed
 * @returns - promise of the new document
 */
function embed(document) {
  var deferred = when.defer(),
      embeds = document.querySelectorAll('[data-embed]'),
      resolvedPathPromises = [],
      i, l, e;

  if (!embeds.length) {
    return when.resolve(document);
  }

  console.log('embedding');

  for (i = 0, l = embeds.length; i < l; i++) {
    (function (e) {
      resolvedPathPromises.push(
        resolvePath(e.attributes['data-embed'].value).then(function (srcs) {
          var embeddablePromises = [];
          var selector = e.attributes['data-selector'] && e.attributes['data-selector'].value;

          console.log('resolved paths to:', srcs);
          console.log('selector: ', selector);

          srcs.forEach(function (src) {
            embeddablePromises.push(readHTML(Path.join(src, 'model.html')).then(function (window) {
              if (selector) {
                console.log('querySelecting for ', Path.join(src, 'model.html'));
                return window.document.querySelector(selector);
              } else {
                console.log('returning whole body for ', Path.join(src, 'model.html'));
                return window.document.body;
              }
            }));
          });

          return when.settle(embeddablePromises).then(function (embeddables) {
            console.log('all settled up');
            embeddables.forEach(function (embeddable) {
              if (embeddable.value) {
                console.log('creating an element: ', e.tagName);
                var el = document.createElement(e.tagName), i, l, a;

                el.innerHTML = embeddable.value.innerHTML;
                for (i = 0, l = embeddable.value.attributes.length; i < l; i++) {
                  a = embeddable.value.attributes[i];
                  el.setAttribute(a.name, a.value);
                }
                e.parentNode.insertBefore(el, e);
              } else {
                console.log('skipping failed embeddable');
              }
            });
            e.parentNode.removeChild(e);
            console.log('returning e to be resolved');
            return e;
          });
        })
      );
    })(embeds[i]);
  }

  when.settle(resolvedPathPromises).then(function () {
    deferred.resolve(document);
  });

  return deferred.promise;
}
