var index = require("../index");
index.parse("E:/test/pareseengine/pay",function(alldeps) {
	console.log(alldeps);
},function(a,b,c){
	console.log(a.root);
	console.log(a.parent);
	console.log(a.path);
});