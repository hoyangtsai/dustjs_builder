var index = require("../index");
index.parseList(["F:/dev_branches/cdn_dev/htdocs/res/mqq/credit_v2/js/accredit/index","F:/dev_branches/cdn_dev/htdocs/res/mqq/credit_v2/js/mycredit/index"],function(result) {
	console.dir(result);
},function(a,b,c){
	console.log(a.root);
	console.log(a.parent);
	console.log(a.path);
});