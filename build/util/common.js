var normalize = require('normalize-path');
var path = require('path');
var fs = require('fs-extra');
var regExpMap = {
  htmlJsEntry: /(seajs|dust)\.use\(.*?(['"].*['"])/gim
};
const dirTree = require('directory-tree');
var set = function (key, val) {
  global[key] = val;
};

var get = function (key) {
  return global[key];
};

var formatNormalizePath = function (v) {
  if (typeof v === 'string' && path.isAbsolute(v)) {
    return normalize(v);
  }
  return v;
};

var formatInitData = function (initData) {
  for (var key in initData) {
    if (Array.isArray(initData[key])) {
      initData[key] = initData[key].map(function (v) {
        return formatNormalizePath(v);
      });
    } else {
      initData[key] = formatNormalizePath(initData[key]);
    }
  }
  global.initData = initData;
  return initData;
};

var getVerisonPathInner = function (jsFilePath, htmlTrunkPath) {
    if (!jsFilePath) {
      return false;
    }
    // htmlTrunkPath = htmlTrunkPath.replace(/htdocs.*/, '');
    var cdnPathSnippet = jsFilePath.replace(new RegExp('.*?res'), '');

    if (cdnPathSnippet.indexOf('/js/') !== -1) {
      cdnPathSnippet = cdnPathSnippet.replace(/js.*/, '');
    } else {
      cdnPathSnippet = path.dirname(cdnPathSnippet);
    }

    var versionPath = path.join(htmlTrunkPath, 'inc/version', cdnPathSnippet, '_global.version');
    return versionPath; 
};

var walkGlobalVersion = function (dPath) {
        var result = '';
        let treedata = dirTree(dPath);
        function showTreeNode(children){
            var item;
            for(var i = 0; i < children.length; i++){
                item = children[i];
                if (path.basename(item.path) === '_global.version' && !result) {
                    result = item.path;
                }
                if (!result) {
                  showTreeNode(item.children || []);
                }
            }
        }
        showTreeNode(treedata.children || []);
        return result;
};

// htmlTrunkPath页面主干路径
var getVerisonPath = function () {
    var firstVersionPath;
    var versionPath;
    var walkVersion;
    if (global.versionPath) {
      return global.versionPath;
    }

    var htmlTrunkPath = global.initData.localtrunkpath;

    if (/.*?htdocs/.test(htmlTrunkPath)) {
      htmlTrunkPath = htmlTrunkPath.replace(/htdocs.*/, 'htdocs');
    } else if (fs.pathExistsSync(path.join(htmlTrunkPath, 'htdocs'))) {
    htmlTrunkPath = path.join(htmlTrunkPath, 'htdocs');
  }

    for (let [key, value] of global.parseData) {
      versionPath = getVerisonPathInner(value[0], htmlTrunkPath);
      if (!firstVersionPath) {
        firstVersionPath = versionPath;
      }
      if (fs.pathExistsSync(versionPath)) {
        break;
      } else {
        versionPath = '';
      }
    }

    if (!versionPath) {
      global.sLog('所选的文件生成的_global.version不存在，开始遍历inc/version', 3);
	  var walkPath = path.join(htmlTrunkPath, 'inc/version');
      if (fs.pathExistsSync(versionPath)) {
        walkVersion = walkGlobalVersion(walkPath);
      } else {
		  walkVersion = '';
	  }
      
      if (!walkVersion) {
        global.sLog('遍历inc/version也没有找到_global.version', 3);
        versionPath = firstVersionPath;
      } else {
        versionPath = walkVersion;
        global.sLog('遍历inc/version找到_global.version: ' + walkVersion, 3);
      }
    }
    
    versionPath = normalize(versionPath);
    global.versionPath = versionPath;
    return versionPath;
};

var getTestDestPath = function () {
  if (global.testDestPath) {
    return global.testDestPath;
  }
  var zipDest = global.initData.zippath;
  var cdnVersion = global.initData.cdnversion;
  global.testDestPath = normalize(path.join(zipDest, cdnVersion, '/main/htdocs/res/'));    
  return global.testDestPath;
};

var getTestIncludePath = function () {
  var mVal; // 中间值
  if (global.testIncludePath) {
    return global.testIncludePath;
  }
  var data = global.initData;

  if (global.versionPath.indexOf('htdocs') !== -1) {
    mVal = global.versionPath.replace(new RegExp('.*?htdocs'), 'htdocs');
    global.testIncludePath = normalize(path.join(data.zippath, data.htmlversion, 'main', mVal));
  } else {
    global.testIncludePath = global.versionPath.replace(data.localtrunkpath, normalize(path.join(data.zippath, data.htmlversion, 'main')));
  }
  // global.testIncludePath = global.versionPath.replace(data.localtrunkpath, data.zippath + data.htmlversion + '/main/');
  return global.testIncludePath;
};

var getJsDest = function () {
  if (global.initData.buildtype === 'TEST') {
    return getTestDestPath();
  }
  return global.initData.jspubbase;
};

//var urlObj = {"cacheFlag":true,"compressFlag":true,"base":"https://mqq-imgcache.gtimg.cn/res/","cwd":"https://mqq-imgcache.gtimg.cn/","compressApi":"https://mqq-imgcache.gtimg.cn/c/=","debug":false};
var generateCfgObj = function () {
  return {
    cacheFlag: global.initData.cacheFlag || true,
    compressFlag: global.initData.compressFlag || true,
    base: global.initData.urlbase || '',
    cwd: global.initData.cdnroot || '',
    compressApi: global.initData.compressApi || '',
    debug: global.initData.debug || false,
    splitFlag: global.initData.splitFlag || false
  };
};

var getHtmlDestPath = function (htmlFilePath) {
  var mVal; // 中间值
    htmlFilePath = normalize(htmlFilePath);
    if (global.initData.buildtype === 'TEST') {
      if (htmlFilePath.indexOf('htdocs') !== -1) {
        mVal = htmlFilePath.replace(new RegExp('.*?htdocs'), 'htdocs');
        return path.dirname(normalize(path.join(global.initData.zippath, global.initData.htmlversion, 'main', mVal)));
      }
      return path.dirname(htmlFilePath.replace(global.initData.repoType !== 'git' ? global.initData.localtrunkpath : global.initData.localsrcpath, normalize(path.join(global.initData.zippath, global.initData.htmlversion, 'main'))));
    }
    return path.dirname(htmlFilePath.replace(normalize(global.initData.repoType !== 'git' ? global.initData.localtrunkpath : global.initData.localsrcpath), normalize(global.initData.localtrunkpath)));
};

var getIncludeVirtualPath = function () {
    if (global.initData.includevirtualpath) {
      return normalize('/' + global.initData.includevirtualpath).replace(/^\/*/, '/');
    }
    return '';
};

var checkTemplate = function (val) {
  return /.*?template/.test(val);
};

var renderInclude = function (isTemplate, val) {
  if (isTemplate) {
    return '<?cs include:PARSE_PATH("' + val + '") ?>';
  }

  return '<!--#include virtual="' + val + '" -->';
};

var formatPath = function (value) {
    if (typeof value === 'string') {
        value = value.replace(new RegExp('.*?res'), '/res');
        if(value.endsWith(".js") || value.endsWith(".css") || value.endsWith(".tpl")){
            return value;
        }
        return value + ".js";                
    }
    value = value.map(v => {
        v = v.replace(new RegExp('.*?res'), '/res');

        if(v.endsWith(".js") || v.endsWith(".css") || v.endsWith(".tpl")){
            return v;
        }

        return v + ".js";
    });
    return value;
};

// 处理js依赖关系
var handleRelation = function (depandData) {
  var relationObj = {};
  depandData.forEach(function(value1, key1, map1) {   
      var relationList = Array.from(new Set([...value1.root, ...value1.sync]));
      
      relationList.forEach(function (val) {
          var list = value1.deps.get(val), key;

          if (list) {
              list = Array.from(list);
          } else {
              list = [];
          }

          key = formatPath(val);

          if (!relationObj[key]) {
            relationObj[key] = formatPath(list);
          }
      });
  });
  global.relationObj = relationObj;
};

var handleDefineDepends = function (contents, fPath, isDebug) {
  var relationObj = global.relationObj;
  var depsData;

  fPath = normalize(fPath);
  fPath = formatPath(fPath);
  if (!relationObj[fPath]) {
    return contents;
  }
  if (isDebug) {
    depsData = relationObj[fPath].map(function (v) {
      if (/^(https?|\/\/)/.test(v)) {
        return v;
      }
      return v.replace(/(.*?)(\.js|\.css|\.tpl)?$/, function (all, g1, g2) {
          if (g2) {
              if (g2 !== '.js') {
                return g1 + g2 + '-debug';
              }
              return g1 + '-debug' + g2;
          }
          return g1 + '-debug';
      });
    });
  } else {
    depsData = relationObj[fPath];
  }

  contents = contents.replace(/(define.*?)(\[.*?\])/, function (all, g1, g2) {
    if (!g1 && !g2) {

      return all;
    }
    return g1 + JSON.stringify(depsData);
  });

  return contents;
};

var getMd5Path = function (val) {
  if (/.*?res/.test(val)) {
    return val.replace(new RegExp('.*?res'), 'res');
  }
  return val;  
};

var getReplaceContent = function (val) {
  val = normalize(val);
  if (/.*?htdocs/.test(val)) {
    return val.replace(new RegExp('.*?htdocs'), '');
  }
  if (/.*?template/.test(val)) {
    return val.replace(new RegExp('.*?template'), 'template');
  }

  return val.replace(global.initData.localtrunkpath, '');
};

var getIncHtmlPath = function (pagePath, versionPath) {
  return path.join(versionPath.replace('_global.version', ''), getReplaceContent(pagePath));
};

var checkGlobalPath = function (path) {
  path = normalize(path);
  return /res\/g/.test(path);
};

var getGlobalVersion = function (path) {
  path = normalize(path);
  path = path.replace(new RegExp('.*?res'), 'res');

  for (var i = 0; i < global.globalData.length; i++) {
    if (global.globalData[i].path === '/' + path) {
      return global.globalData[i].ModuleVersions[0].version || 1;
    }
  }
  return 1;
};

var formatMd5Map = function (md5Map) {
  var data = {};
  for (var key in md5Map) {
    if (/^(https?|\/\/)/.test(key)) {
      data[key] = md5Map[key];
    } else {
      data[normalize(key).replace(/.*?res/, '/res')] = md5Map[key];
    } 
  }
  global.md5Map = data;
};

var getPageVersion = function (key, value) {
  var pageList = global.pageList || [];
  var dependList = global.dependList || [];
  var pageItem = {
    path: key.replace(/.*?htdocs/, ''),
    entryjs: []
  };
  var dependItem;
  var item, path, relationObj = {}, pageVersion = {};

  var entryList = Array.from(new Set([...value.root, ...value.sync]));

  for (var i = 0; i < entryList.length; i++) {
    item = {};
    dependItem = {root: {}, depend: []};
    path = normalize(entryList[i]);
    path = path.replace(/.*?res/, '/res');
    dependItem.root.path = path;

    if (value.root.has(entryList[i])) {
      item.entrytype = 0;
    } else {
      item.entrytype = 1;
    }
    item.path = path;
    item.newversion = global.md5Map[path]; 
    pageVersion[path] = global.md5Map[path];
    dependItem.root.newversion = global.md5Map[path];
    dependList.push(dependItem);
    pageItem.entryjs.push(item);
  }
  pageList.push(pageItem);
  entryList.forEach(function (val) {
      var list = value.deps.get(val);
      var fVal = formatPath(val);
      var fList;

      if (list) {
          list = Array.from(list);
      } else {
          list = [];
      }

      fList = formatPath(list);

      relationObj[fVal] = fList;

      for (var i = 0; i < dependList.length; i++) {
        if (dependList[i].root.path === fVal) {
          fList.forEach(function (val) {    
            // pageVersion[val] = global.md5Map[val];
            dependList[i].depend.push({
              path: val,
              newversion: global.md5Map[val]
            });
          });
          break;
        }
      }

  });

  for (var k = 0; k < global.pageData[key].length; k++) {
    var _path = global.pageData[key][k];
    if (/^(https?|\/\/)/.test(_path)) {
    
    } else {
      _path = normalize(_path).replace(/.*?res/, '/res');

        if(_path.endsWith(".js") || _path.endsWith(".css") || _path.endsWith(".tpl")){
            
        } else {
          _path = _path + '.js';
        }
    }   
    pageVersion[_path] = global.md5Map[_path];

  }



  global.pageList = pageList;
  global.dependList = dependList;
  return {
    pageVersion: pageVersion,
    relationObj: relationObj
  };
};

var commitProjectData = function (projectData, cb) {
  var count = 0;
  api.addPageList({project: projectData, pagelist: global.pageList}, function (res) {
    console.log('addPageList ok');
    count++;
    if (count === 2) {
      cb();
    } 
  }, function (res) {
    console.log('addPageList error');
  });
  api.updateRely(global.dependList, function (res) {
    console.log('updateRely ok');
    count++;
    if (count === 2) {
      cb();
    }  
  }, function (res) {
    console.log('updateRely error');
  });
};


var savePageData = function (key, value) {
  if (!global.pageData) {
    global.pageData = {};
  }
  global.pageData[key] = value;
};


// <?cs include:PARSE_PATH("/inc/version/weixin/metro/_global.version") ?>
// <?cs include:PARSE_PATH("/inc/version/weixin/metro/template/view/index.shtml") ?>

module.exports = {
  set: set,
  get: get,
  getVerisonPath: getVerisonPath,
  getTestDestPath: getTestDestPath,
  getTestIncludePath: getTestIncludePath,
  getIncHtmlPath: getIncHtmlPath,
  formatInitData: formatInitData,
  generateCfgObj: generateCfgObj,
  getHtmlDestPath: getHtmlDestPath,
  getIncludeVirtualPath: getIncludeVirtualPath,
  checkTemplate: checkTemplate,
  renderInclude: renderInclude,
  handleRelation: handleRelation,
  handleDefineDepends: handleDefineDepends,
  getJsDest: getJsDest,
  formatPath: formatPath,
  getMd5Path: getMd5Path,
  regExpMap: regExpMap,
  checkGlobalPath: checkGlobalPath,
  getGlobalVersion: getGlobalVersion,
  getPageVersion: getPageVersion,
  formatMd5Map: formatMd5Map,
  commitProjectData: commitProjectData,
  savePageData: savePageData
};