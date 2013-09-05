var express = require('express');
var app = express();
var Path = require('path');
var fs = require('fs');
var jsdom = require('jsdom');
var when = require('when');

app.use(express.logger());

app.use(function (req, res, next) {
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
});

app.use(express.static(__dirname + '/htdocs'));

app.all('*', function (req, res) {
  res.writeHeader(404, {"Content-Type": 'text/plain'});
  res.write('Page not found.');
  res.end();
});

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
  console.log('resolving path: ', path);
  if (path.indexOf('*') !== -1) {
    console.log('resolving path with *: ', path);
    return fsls(path.replace('*', ''));
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
                console.log('creating an element');
                var el = document.createElement(e.tagName);
                el.innerHTML = embeddable.value.innerHTML;
                el.attributes = embeddable.value.attributes;

                // For <meta> tags
                el.name = embeddable.value.name;
                el.content = embeddable.value.content;

                e.parentNode.appendChild(el);
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
