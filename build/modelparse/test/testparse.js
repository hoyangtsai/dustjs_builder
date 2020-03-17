var Buffer = require('buffer');

var fileutil = require("../fileutil");
var parse = require("../parse");

var iduri = require("../iduri");
var base = "F:/dev_branches/qqrp/htdocs/res/mqq/credit/js/app.js";
fileutil.readFile("F:/dev_branches/qqrp/htdocs/res/mqq/credit/js/app.js",function(file){
	console.log("path: " + file.path);
	//console.log("typeof contents: " + typeof (file.contents));
	//console.log("contents: " + file.contents);
	var result = parse.parseDepend(file.contents);
	var deps = result.deps || [];
	var sync = result.sync || [];
	for(var i = 0 ; i < deps.length; i++){
		console.log("deps:" + deps[i]);
		console.log("deps absolute:" + iduri.absolute(base,deps[i]));
	}
	for(var j = 0; j < sync.length; j++){
		console.log("sync:" + sync[j]);
		console.log("sync absolute:" + iduri.absolute(base,sync[j]));
	}
});