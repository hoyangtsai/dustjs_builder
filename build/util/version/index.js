var crypto = require('crypto');

function caculateMd5Version(content) {
  var md5 = crypto.createHash('md5'),
    str = md5.update(encodeURIComponent(content)).digest('hex'),
    hash = 5381;
  
  for(var i = 0, l = str.length; i < l; i ++){
    hash += (hash << 5) + str.charAt(i).charCodeAt();
  }
  return Math.abs(hash);
}

module.exports = {
  caculateMd5Version : caculateMd5Version
}

/*module.exports = function(options) {
  var separator, size, printOnly;

  if (typeof options === 'object') {
    printOnly = options.printOnly || false;
    separator = options.separator || '.';
    size = options.size | 0;
  } else {
    size = options | 0;
    separator = '.';
    printOnly = false;
  }

  return through.obj(function(file, enc, cb) {
    if (file.isStream()) {
      this.emit('error', new gutil.PluginError('gulp-debug', 'Streaming not supported'));
      return cb();
    }

    var md5Hash = calcMd5(file, size),
      filename = path.basename(file.path),
      dir;

    if (printOnly) {
      gutil.log(filename + ' ' + md5Hash);
      return cb(null, file)
    }

    if (file.path[0] == '.') {
      dir = path.join(file.base, file.path);
    } else {
      dir = file.path;
    }
    dir = path.dirname(dir);

    filename = filename.split('.').map(function(item, i, arr) {
      return i == arr.length - 2 ? item + separator + md5Hash : item;
    }).join('.');

    file.path = path.join(dir, filename);

    this.push(file);
    cb();
  }, function(cb) {
    cb();
  });
};

function caculateMd5Version(content) {
	var md5 = crypto.createHash('md5'),
		str = md5.update(encodeURIComponent(content)).digest('hex'),
		hash = 5381;
	
	for(var i = 0, l = str.length; i < l; i ++){
		hash += (hash << 5) + str.charAt(i).charCodeAt();
	}
	return Math.abs(hash);
}

function calcMd5(file, slice) {
	return caculateMd5Version(file.contents);
}
*/