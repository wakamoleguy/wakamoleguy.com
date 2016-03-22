(function() {
  'use strict';

  var crypt;

  var config = {
    staticCacheItems: [
      '/css/main.css',
      '/js/main.js',
      '/js/model-crypt.js',
      '/js/model-sync.js',
      '/js/view-password-console.js',
      '/js/view-password-list.js',
      '/js/view-sync.js',
      '/sip-0.7.3.min.js',
      '/openpgp/openpgp.js',
      '/openpgp/openpgp.min.js',
      '/openpgp/openpgp.worker.js',
      '/openpgp/openpgp.worker.min.js',
      '/index.html'
    ],
    cachePathPattern: /^\/pass\//
  };

  /**
   *
   * Installation and activation
   *
   */

  self.addEventListener('install', event => {
    // Do install stuff
    console.log('installing', new Date());

    event.waitUntil(_ => {
      return caches.open('static').
        then(cache => cache.addAll(config.staticCacheItems)).
        then(_ => self.skipWaiting());
    });
  });

  self.addEventListener('activate', event => {
    // Do activate stuff: This will come later on.
    console.log('activating', new Date());
    self.clients.claim();
  });

  /**
   *
   * Fetching and Caching
   *
   */
  self.addEventListener('fetch', event => {
    // … Perhaps respond to this fetch in a useful way?
    var request = event.request;
    var url = new URL(request.url);

    function shouldHandleFetch(event, opts) {
      return opts.cachePathPattern.test(url.pathname) &&
        request.method === 'GET' &&
        url.origin === self.location.origin;
    }

    if (url.hostname === 'crypt.invalid') {
      event.respondWith(crypt.handleRequest(request, event).catch(err => new Response('', {
        status: 500,
        statusText: 'Internal Server Error'
      })));
    } else if (shouldHandleFetch(event, config)) {
      event.respondWith(
        fetch(request)
          .then(response => {
            console.log('caching', url.pathname);
            return caches.open('static').then(cache => {
              cache.put(request, response.clone());
              return response;
            });
          })
          .catch(() => {
            return caches.match(request).then(response => {
              return response || new Response(undefined, {
                status: 404,
                statusText: 'Item Not Found'
              });
            });
          })
      );
    }
  });


  /**
   * Crypt BREAD API
   *
   * Root Path:  /api/crypt
   *
   * Browse - GET    /api/crypt/
   * Read   - GET    /api/crypt/github.com
   * Edit   - PUT    /api/crypt/github.com
   * Add    - POST   /api/crypt/
   * Delete - DELETE /api/crypt/github.com
   */
  crypt = {
    root: '/api/crypt/',
    parser: new RegExp('^/api/crypt/(?:([^/?#]*)/)?$'),
    cache: 'crypt',

    putCache(key, value) {
      return caches.open(this.cache).then(cache => {
        let response = new Response(JSON.stringify({
          value: value
        }), {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        cache.put('https://crypt.invalid/api/crypt/' + key + '/', response);
        return;
      });
    },

    getCache(key) {
      return caches.match('https://crypt.invalid/api/crypt/' + key + '/').then(response => {
        return response || new Response(undefined, {
          status: 404,
          statusText: 'Item Not Found'
        });
      });
    },

    deleteCache(key) {
      return caches.open('crypt').then(cache => {
        return cache.delete('https://crypt.invalid/api/crypt/' + key + '/');
      }).then(deleted => {
        if (deleted) {
          return new Response(undefined, {
            status: '204',
            statusText: 'No Content'
          });
        } else {
          return new Response('', {
            status: '404',
            statusText: 'Not Found'
          });
        }
      });
    },

    handleRequest(request) {
      return new Promise((resolve, reject) => {
        let url = new URL(request.url);

        // Is this a cert request?
        if (url.pathname === '/api/cert/') {
          if (request.method === 'GET') {
            resolve(this.getCert());
          } else if (request.method === 'PUT') {
            resolve(this.putCert(request));
          } else {
            reject(new Error('Undefined operation! ' +
              request.method + ' to ' + request.pathname));
          }
          return;
        }

        /* Non cert requests */

        // Validate the URL
        let match = url.pathname.match(this.parser);
        if (match === null) {
          reject(new Error('Invalid URL detected! ' + url.toString()));
        }

        // Determine the operation
        let key = match[1];
        if (key === undefined) {
          // Browse or Add

          if (request.method === 'GET') {

            resolve(this.browse());
          } else if (request.method === 'POST') {

            // TODO - get key, value from POST
            resolve(this.add(request));
          } else {

            reject(new Error('Undefined operation! ' +
              request.method + ' to ' + request.pathname));
          }

        } else {
          // Read, Edit, or Delete
          if (request.method === 'GET') {

            resolve(this.read(request, key));
          } else if (request.method === 'PUT') {

            // TODO - get value from PUT
            resolve(this.edit(request, key));
          } else if (request.method === 'DELETE') {

            resolve(this.delete(request, key));
          } else {

            reject(new Error('Undefined operation! ' +
              request.method + ' to ' + request.pathname));
          }
        }

      });
    },

    browse() {
      return caches.open(this.cache).
      then(cache => cache.keys()).
      then(keys => new Response(JSON.stringify(
        keys.map(req => req.url).filter(url => (this.parser.test(new URL(url).pathname)))
      )));
    },

    read(request, key) {
      return this.getCache(key);
    },

    edit(request, key) {
      return new Response('', {
        status: 501,
        statusText: 'Not Yet Implemented'
      });
    },

    add(request) {
      return request.json().then(data => {
        let k = data.key;
        let v = data.value;

        return this.putCache(k, v).then(_ => (
          new Response(`/api/crypt/${k}/`, {
            status: 201,
            statusText: 'Created'
          })
        ));
      });
    },

    delete(request, key) {
      return this.deleteCache(key);
    },

    putCert(request) {
      return request.json().then(data => {
        return caches.open(this.cache).then(cache => {
          let response = new Response(JSON.stringify({
            value: data
          }), {
            headers: {
              'Content-Type': 'application/json'
            }
          });

          cache.put('https://crypt.invalid/api/cert/', response);
          return new Response('', {
            status: 200,
            statusText: 'OK'
          });
        });
      });
    },

    getCert() {
      return caches.match('https://crypt.invalid/api/cert/').then(response => {
        return response || new Response(undefined, {
          status: 404,
          statusText: 'Item Not Found'
        });
      });
    },

  };

})();
