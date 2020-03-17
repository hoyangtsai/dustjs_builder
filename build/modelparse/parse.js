var UglifyJS = require("uglify-js");

function parseAST(code, filePath, options){
	try {
		var ast = UglifyJS.parse(code, options || {});
	} catch (e) {
		global.sLog('语法错误: ' + filePath + '|lineNumber:' + e.line + '|' + e.message, 3, true);
	}
	return ast;
}

function parseWalker(deps,sync){
	var walker = new UglifyJS.TreeWalker(function(node,descend){
		if (node instanceof UglifyJS.AST_Call && node.start.value === 'require' && !node.expression.property) {
	      var args = node.expression.args || node.args;
	      if (args && args.length === 1) {
	        var child = args[0];
	        if (child instanceof UglifyJS.AST_String) {
			  var cpath = child.getValue();
			  //if(!cpath.startsWith('//') && !cpath.startsWith("http")){
				  deps.push(child.getValue());
			  // }
	        }
	        // TODO warning
	      }
	      return true;
	    }else if (node instanceof UglifyJS.AST_String) {
	        var p = walker.parent();
	        if (p instanceof UglifyJS.AST_Call 
	        	  && node !== p.expression 
	        	  && (typeof p.start != "undefined" && p.start.value == "require") 
	        	  && (typeof p.expression != "undefined" && p.expression.property == "async")) {
	            var args = p.expression.args || p.args;
	            if(args){
	            	for(var i = 0; i < args.length; i++){
	            		if(args[i] instanceof UglifyJS.AST_String){
	            			sync.push(args[i].getValue());
	            		}
	            	}
	            }
	            return true;
	        }
        }else if(node instanceof UglifyJS.AST_Array){
        	var p = walker.parent();
	        if (p instanceof UglifyJS.AST_Call 
	        	  && node !== p.expression 
	        	  && (typeof p.start != "undefined" && p.start.value == "require") 
	        	  && (typeof p.expression != "undefined" && p.expression.property == "async")) {
	        	var elements = node.elements || [];
	        	var length = elements.length;
	        	for(var i = 0; i < length; i++){
	        		sync.push(elements[i].getValue());
	        	}
	            return true;
	        }
        }
	});
	return walker;
}

function parseDepend(code, filePath){
	var deps = [],sync = [];
	var walker = parseWalker(deps,sync);
	var ast = parseAST(code, filePath);
	ast.walk(walker);
	return {deps:deps,sync:sync};
}

exports.parseDepend = parseDepend
