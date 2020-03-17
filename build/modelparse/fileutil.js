var fs = require("fs");
//var TidBus = require('tid_bus');
function File(file){
  if (!file) file = {};

  this.path = file.path || "";

  this.contents = file.contents || null;
}
/**
 * path 全局路径
 */

function readFile (path,cb,currentNode) {
	 fs.readFile(path, 'utf8', (err,  data) => {
		  if (err) {
			/**
		  	TidBus.emit('exception:filenotfound', {
				path: path,
		  		node: currentNode  
			});
			*/
		  	throw err
		  };
		  var file = new File({path:path,contents:data})
		  cb(file);
	 });
}
exports.readFile = readFile;