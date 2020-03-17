var index = require("../index");
index.parse("F:/dev_branches/qqrp/htdocs/res/mqq/credit/js/index",function(alldeps) {
	console.log("alldeps.size:" + alldeps.size);
	alldeps.forEach(function(value){
		console.log(value);
	});
},function(a,b,c){
	console.log(a.root);
	console.log(a.parent);
	console.log(a.path);
});