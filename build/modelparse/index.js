var fileutil = require("./fileutil");
var parse = require("./parse");
var iduri = require("./iduri");
var domain = require('domain');
var normalize = require('normalize-path');
var d = domain.create();
var initData;
var pathMod = require('path');
var fs = require('fs-extra');

var currentNode = null;

function Node(){
	this.path = "";//当前文件路径
	this.parent = "0"; //引用当前文件的文件路径
	this.root = "0"; //require当前文件的根文件：1.入口文件；2.sync文件
	this.isSync = false; //是不是异步模块
	this.isParsed = false; //是否已经解析过
	this.isThree = false; //是否是第三方模块
}

function ParseEngin(){
	this.all = new Set();	//所有依赖项
	this.hash = new Set();  //相同路径重复解析
	this.allIter = this.all.values(); //等待解析项遍历器
	this.callback = function(){console.log("parse finished! but no call back")};
	this.onerror = function(){console.log("parse onerror! but no call back")};
}

ParseEngin.prototype.parseCode = function(pNode,code, filePath) {
	var result = parse.parseDepend(code, filePath);
	var depsArray = result.deps || [];
	var syncArray = result.sync || [];
	var base = pNode.path;
	for(var i = 0 ; i < depsArray.length; i++){
		var node = new Node();
		var path = iduri.absolute(base,depsArray[i]);
		//if(!this.hash.has(path)){
//console.log(base);
//console.log(iduri.relative('res',depsArray[i]))
			node.path = path;
			node.parent = pNode.path;
			node.root = (pNode.root === "0" ? pNode.path : pNode.root);
			node.isSync = false;
			this.all.add(node);
			this.hash.add(path);
		//}
	}
	for(var j = 0; j < syncArray.length; j++){
		var node = new Node();
		var path = iduri.absolute(base,syncArray[j]);
		if(!this.hash.has(path)){
			node.path = path;
			node.parent = pNode.path;
			node.isSync = true;
			this.all.add(node);
			this.hash.add(path);
		}
		pNode.isParsed = true;
	}
	this.scanNode();
};

ParseEngin.prototype.readCode = function(node){
	currentNode = node;
	var path = node.path;
    var filePath = path;
	if (!/\.js$/.test(filePath) && !/.css$|.tpl$/.test(filePath)) {
        filePath += ".js";
    }
	var _this = this;
    if(!filePath.startsWith('//') && !/https{0,1}:\/\//.test(filePath) && !/.css$|.tpl$/.test(filePath)){ //外联模块不处理
	    d.run(()=>{
	    	fileutil.readFile(filePath,function(file){
	    		// console.log(filePath);
				_this.parseCode(node,file.contents, filePath);
			}, currentNode);
	    });   	
    }else{
    	node.isThree = true;
    	_this.parseCode(node,"");
    }
};

ParseEngin.prototype.scanNode = function(){
	var next = this.allIter.next().value;
	if(typeof next != "undefined"){
		this.readCode(next);
	}else{
		this.finished();
	}
};

ParseEngin.prototype.finished = function(){
	var result = {
		root : new Set(), //入口js
		sync : new Set(), //sync加载列表
		deps : new Map()  //入口（或sync）依赖项，key：入口（sync），value set 依赖项
	};
	this.all.forEach(function(node){
        if (global.fitTheme && node.path && node.path.indexOf('fitTheme') !== -1) {
            var fitDirPath = pathMod.join(initData.jslocalbase, '/g/fit-ui/components/component');
            var fitReqPath = pathMod.join(global.fitTheme, node.path.replace('fitTheme', ''));
            
            node.path = normalize(pathMod.join(fitDirPath, fitReqPath));
	        if (!fs.pathExistsSync(node.path)) {
	        	global.sLog('模块路径不存在: ' + node.path, 3, true);
	        }
        }

		if(node.root === "0" && node.isSync === false){
			result.root.add(node.path);
		}else if(node.root === "0" && node.isSync === true){
			result.sync.add(node.path);
		}else{
			var depsSet = result.deps.get(node.root);
			if(typeof depsSet == "undefined"){
				depsSet = new Set();
				depsSet.add(node.path);
				result.deps.set(node.root,depsSet);
			}else{
				depsSet.add(node.path);
			}
		}
	});
	this.callback(result);
};

/**
 * 入口js path
 * callback传出参数
 var result = {
		root : '', //入口js
		sync : new Set(), //sync加载列表
		deps : new Map()  //入口（或sync）依赖项，key：入口（sync），value set 依赖项
   };
 */
exports.parse = function(jspath,callback,onerror){
	var parseEngin = new ParseEngin();
	parseEngin.callback = callback;
	if(typeof onerror === "function"){
		parseEngin.onerror = onerror
	}
	d.on('error',function(err){
		console.log(err);
    	parseEngin.onerror(err);
	});
	var rootNode = new Node();
	rootNode.path = jspath;
	parseEngin.all.add(rootNode);
	parseEngin.scanNode();
};

exports.parseList = function(jspathList, _initData, callback,onerror){
	var parseEngin = new ParseEngin();
	initData = _initData;
	parseEngin.callback = callback;
	if(typeof onerror === "function"){
		parseEngin.onerror = onerror
	}
	d.on('error',function(err){
		console.log(err);
    	parseEngin.onerror(err);
	});
	let item = null;
	for(let i = 0; i < jspathList.length; i++){
		item = jspathList[i];
        if (!fs.pathExistsSync(item)) {
        	global.sLog('入口JS不存在: ' + item, 3, true);
        }
		global.sLog('解析入口JS: ' + item, 1);
		var rootNode = new Node();
		rootNode.path = item;
		parseEngin.all.add(rootNode);
	}
	parseEngin.scanNode();
}