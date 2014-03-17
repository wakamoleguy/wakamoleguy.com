require('http').request({
  hostname: 'www.wakamoleguy.com',
  port: 80,
  path: '/',
  method: 'GET'
}).end();