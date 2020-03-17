/**
 * 生成依赖关系文件
 * @name relation
 * @author devonwen
 */

var Task = require('../tasks/Task');
var gulp = require('gulp');
var save = require('gulp-save');
var through2 = require('through2');
var normalize = require('normalize-path');
var path = require('path');
var fs = require('fs-extra');
var common = require('../util/common');
// var urlObj = {"cacheFlag":true,"compressFlag":true,"base":"https://mqq-imgcache.gtimg.cn/res/","cwd":"https://mqq-imgcache.gtimg.cn/","compressApi":"https://mqq-imgcache.gtimg.cn/c/=","debug":false};
var tpl;

fs.readFile(path.join(__dirname, 'tpl/html.tpl'), (err, data) => {
    tpl = data.toString();
});

class RelationTask extends Task {
    constructor (taskname, engine, depend) {
        super(taskname, engine, depend);
    }
    getInputData () {
        var result = [];
        var inputData = this.engine.getData('versionparser');

        return inputData;
    }
    setOutPutData (data) {
        this.engine.setData(this.taskname,data);
    }
    execTask (inputData, outputData, cb) {
        var _this = this;
        console.time(this.taskname);
        var versionPath = inputData.versionPath;
        // var globalIncludePath = versionPath.replace(new RegExp('.*?inc/version'), '/inc/version');
        // var onlineVersion = '<!--#include virtual="' + versionPath.replace(new RegExp('.*?inc/version'), common.getIncludeVirtualPath() + '/inc/version') + '" -->';
        var onlineVersion = versionPath.replace(new RegExp('.*?inc/version'), common.getIncludeVirtualPath() + '/inc/version');
        
        var completeFlag = {};
        var result = {};
        var count = 0;
        var initData = this.engine.getData("BuildEngineInitData");
        var depandData = this.engine.getData("jsdependpraser");
        var formatPath = function (value) {
            if (typeof value === 'string') {
                value = value.replace(new RegExp('.*?res'), '/res');
                if(value.endsWith(".js")){
                    return value;
                }
                return value + ".js";                
            }
            value = value.map(v => {
                v = v.replace(new RegExp('.*?res'), '/res');

                if(v.endsWith(".js")){
                    return v;
                }

                return v + ".js";
            });
            return value;
        };

        var handleDeps = function (depsSrcFile, depsFileList) {
            if (depsSrcFile.indexOf('/js/') !== -1) {
                var depsPartPath = depsSrcFile.replace(new RegExp('.*?js'), '').replace(/js$/, 'deps');
            } else {
                var depsPartPath = depsSrcFile.replace(new RegExp('.*?res'), '').replace(/js$/, 'deps');
            }
            // var depsPartPath = depsSrcFile.replace(new RegExp('.*?js'), '').replace(/js$/, 'deps');
            var depsPath = normalize(path.join(versionPath.replace('_global.version', ''), depsPartPath));
            var depsIncludePath = depsPath.replace(new RegExp('.*?inc/version'), common.getIncludeVirtualPath() + '/inc/version');
            
            completeFlag[depsSrcFile] = depsIncludePath;

            if (!depsFileList) {
                depsFileList = [];
            } else {
                depsFileList = Array.from(depsFileList);
            }
            depsFileList = common.formatPath(depsFileList);

            fs.outputFile(depsPath, JSON.stringify(depsFileList))
            .then((err, data) => {
            });
            return depsIncludePath;
        };

        var doEnd = function () {
            _this.setOutPutData(result);
            cb();
            console.timeEnd(_this.taskname);
        };

        depandData.forEach(function(value1, key1, map1) {

            var relationObj = {};
            var isTemplate = common.checkTemplate(key1);
            var mainFile;
            var relationList = Array.from(new Set([...value1.root, ...value1.sync]));
            var htmlPath = common.getIncHtmlPath(key1, versionPath);
            // var htmlPath = path.join(versionPath.replace('_global.version', ''), (isTemplate ? key1.replace(new RegExp('.*?template'), 'template') : key1.replace(new RegExp('.*?htdocs'), '')));         
            // var htmlPath = path.join(versionPath.replace('_global.version', ''), key1.replace(new RegExp('.*?htdocs'), '').replace(new RegExp('.*?template'), 'template'));         
            var htmlContent;
            var pageData = common.getPageVersion(key1, value1);

            htmlPath = normalize(htmlPath);

            if (!global.buildPage) {
                if (value1.root.size > 0) {
                    mainFile = relationList.shift();
                    if (completeFlag[mainFile]) {
                        relationObj[common.formatPath(mainFile)] = common.renderInclude(isTemplate, completeFlag[mainFile]);
                    } else {
                        relationObj[common.formatPath(mainFile)] = common.renderInclude(isTemplate, handleDeps(mainFile, value1.deps.get(mainFile)));
                    }    
                }
                
                relationList.forEach(function (val) {
                    var list = value1.deps.get(val);

                    if (list) {
                        list = Array.from(list);
                    } else {
                        list = [];
                    }

                    relationObj[common.formatPath(val)] = common.formatPath(list);
                });

                htmlContent = tpl.replace('{{global}}', common.renderInclude(isTemplate, onlineVersion)).replace('{{url}}', JSON.stringify(common.generateCfgObj())).replace('{{relation}}', JSON.stringify(relationObj));                
            } else {
                htmlContent = tpl.replace('{{global}}', JSON.stringify(pageData.pageVersion)).replace('{{url}}', JSON.stringify(common.generateCfgObj())).replace('{{relation}}', JSON.stringify(pageData.relationObj));
            }

            if (isTemplate) {
                htmlContent = htmlContent.replace('"<?cs', '<?cs').replace('?>"', '?>').replace(/\\"/g, '"')
            } else {
                htmlContent = htmlContent.replace('"<!--', '<!--').replace('-->"', '-->').replace(/\\"/g, '"')
            }
            
            result[key1] = common.renderInclude(isTemplate, htmlPath.replace(new RegExp('.*?inc/version'), common.getIncludeVirtualPath() + '/inc/version'));
            // result[key1] = '<!--#include virtual="' + htmlPath.replace(new RegExp('.*?inc/version'), common.getIncludeVirtualPath() + '/inc/version') + '" -->';

            fs.outputFile(htmlPath, htmlContent)
            .then((err, data) => {
                if(err){
                    global.sLog('依赖关系页面构建出错: '  + JSON.stringify(err), 3, true);
                }
                count++;
                if (count === depandData.size) {
                    doEnd();
                }
            });

        });
    }
}

module.exports = RelationTask;