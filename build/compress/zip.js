"use strict";
var fs = require("fs");
var zip = require('node-native-zip');
var Q = require("q");
var dtd = Q.defer();

var zip_tool = {
	zip:function(dirPath, outPath){

		var dtd = $.Deferred();
        if (!fs.existsSync(dirPath)) {
        	dtd.reject(1,"源路径文件不存在");
        	console.log("源路径文件不存在");
        }
        else{
			var filesArry = [];
			outPath = outPath || (dirPath + '.zip');
			fileMapping(dirPath,filesArry);
			var archive = new zip();
			archive.addFiles(filesArry, function(){
				var buff = archive.toBuffer();
				var writeStream = fs.createWriteStream(outPath);
				writeStream.write(buff,"UTF-8");				
				writerStream.on('finish', function() {
        			console.log("文件压缩成功:" + outPath);
				});
				writerStream.on('error', function(err) {
				  console.log(err.stack);
				});
				/*
				fs.writeFile(outPath, buff, function () {
					dtd.resolve(0,outPath);
        			console.log("文件压缩成功:" + outPath);
				});*/
			});
        }

		function fileMapping(path){
			var _this = this;
			var files = fs.readdirSync(path);
			files.forEach(function(file){
				var tempPath = path + '/' + file;
				var stats = fs.statSync(tempPath);
				if(stats.isDirectory()){
					fileMapping(tempPath);
				} else {
					var fileName = tempPath.slice((dirPath + '/').length);
					if (!/\.zip$/.test(fileName)) {
						filesArry.push({name:fileName, path:tempPath});
					}
				}
			});
		}

		return dtd.promise();
	},
	
}

module.exports = zip_tool;
