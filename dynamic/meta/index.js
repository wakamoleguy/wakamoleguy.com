var blog = require('../../blog');
var when = require('when');
var meta = null;

exports.getMetaData = function () {

  var deferred = when.defer();
  console.log('called getmetadata');
  if (meta) {
    deferred.resolve(meta);
  } else {
    meta = {};
    console.log('had no metadata');

    blog.list('blog').then(function (previews) {
      meta.post = [];
      console.log('got previews');
      previews.forEach(function (preview) {
        console.log('processing preview');
        meta.post.push({preview: preview.body});
      });
      console.log('done processing previews');
      return deferred.resolve(meta);
    });
  }

  return deferred.promise;
};