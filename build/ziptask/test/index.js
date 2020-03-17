/**
 * 构建流程入口
 * @type {[type]}
 */
const Main = require("../index");

//var main = new Main(['F:/dev_branches/qqrp_proj/htdocs/mqq/credit_v2/accredit/index.shtml','F:/dev_branches/qqrp_proj/htdocs/mqq/credit_v2/privilege/index.shtml'])

var initData = {
	filelist : ['F:/dev_branches/qqrp_proj/htdocs/mqq/credit_v2/accredit/index.shtml','F:/dev_branches/qqrp_proj/htdocs/mqq/credit_v2/privilege/index.shtml'],
	jssrc : 'F:/online_trunk/cdn_trunk/htdocs/res',
	jsbase : 'F:/online_trunk/cdn_trunk/htdocs/res',
	jsout : 'F:/buildtest'
};

var initData = {
	cache:true,
	cdndevpath:"F:/dev_branches/cdn_dev/",
	cdnpubpath:"F:/online_trunk/cdn_online/",
	cdnroot:"https://mqq-imgcache.gtimg.cn/",
	cdnversion:"mqq-imgcache_gtimg_UI_V3.0D05790",
	comparePath:"D:/software/Beyond Compare 3/",
	compareapi:"https://mqq-imgcache.gtimg.cn/c/=",
	debug:false,
	htmlversion:"GWWeb_V3_UI_V3.0D01410",
	localdevpath:"F:/dev_branches/qqrp_proj/",
	localtrunkpath:"F:/online_trunk/qqrp_proj/",
	online:true,
	platformkey:"mqq",
	projectkey:"credit_v2",
	selectfiles:["F:/online_trunk/qqrp_proj/htdocs/mqq/credit_v2/accredit/auth.shtml","F:/online_trunk/qqrp_proj/htdocs/mqq/credit_v2/accredit/index_v2.shtml"],
	svnpath:"D:/software/s/",
	svnsourcepath:"F:/online_trunk/cdn_trunk/",
	urlbase:"https://mqq-imgcache.gtimg.cn/res/",
	zippath:"F:/cdntemp/zippath/",
	jslocalbase : "F:/online_trunk/cdn_trunk/htdocs/res",
	jspubbase : "F:/online_trunk/cdn_online/htdocs/res",
	buildtype : 'TEST'
}

/*var initData = {
	cache:true,
	cdndevpath:"F:/dev_branches/cdn_dev/",
	cdnpubpath:"F:/online_trunk/cdn_online/",
	cdnroot:"https://mqq-imgcache.gtimg.cn/",
	cdnversion:"",
	comparePath:"D:/software/Beyond Compare 3/",
	compareapi:"https://mqq-imgcache.gtimg.cn/c/=",
	debug:false,
	htmlversion:"",
	localdevpath:"F:/dev_branches/report_proj/",
	localtrunkpath:"F:/online_trunk/report_proj/",
	online:true,
	platformkey:"weixin",
	projectkey:"2017/wx_gaokao",
	selectfiles:["F:/online_trunk/report_proj/htdocs/wx_gaokao/index.shtml","F:/online_trunk/report_proj/htdocs/wx_gaokao/evaluate.shtml"],
	svnpath:"D:/software/s/",
	svnsourcepath:"F:/online_trunk/cdn_trunk/",
	urlbase:"https://mqq-imgcache.gtimg.cn/res/",
	zippath:"F:/cdntemp/zippath/",
	jslocalbase : "F:/online_trunk/cdn_trunk/htdocs/res"
}*/

var main = new Main(initData);

main.start()