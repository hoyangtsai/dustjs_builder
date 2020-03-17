/**
 * 处理vue相关
 * @name vue
 * @author devonwen
 */

var Task = require('../tasks/Task');
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var cleanCss = require('gulp-clean-css');
var htmlmin = require('gulp-htmlmin');
var save = require('gulp-save');
var through2 = require('through2');
var normalize = require('normalize-path');
var common = require('../util/common');
var util = require('gulp-util');
var md5 = require('../util/version');
var path = require('path');
var rDefine = /define\(\s*(['"](.+?)['"],)?/;
var fs = require('fs-extra');
var md5File = require('md5-file');

class VueTask extends Task {
    constructor (taskname, engine, depend) {
        super(taskname, engine, depend);
    }
    getInputData () {
        var result = [];
        var jsResult = [];
        var inputData = this.engine.getData("jsdependpraser");
        var initData = this.engine.getData("BuildEngineInitData");
        // common.handleRelation(inputData);

        inputData.forEach(function (value, key, map) {
            var rootJsSet = value.root;
            var syncJsSet = value.sync;
            var depsMap = value.deps;   
            var entr = new Set([...rootJsSet, ...syncJsSet]);
            var pageData = [];
            for(let item of entr.keys()){
                let depsSet = depsMap.get(item);
                if(depsSet && depsSet.size > 0){
                    result = result.concat([...depsSet]);
                    pageData = pageData.concat([...depsSet]);
                }
            }     

            pageData = pageData.concat([...entr]); 
            pageData = Array.from(new Set(pageData));
            common.savePageData(key, pageData);
            result = result.concat([...entr]);   
        });

        result = result.filter(value => {
            if (value.endsWith(".css") || value.endsWith(".tpl")) {
                return true;
            } 
            jsResult.push(value);
            return false;
        });

        return {
            jsResult: jsResult,
            src : Array.from(new Set(result)),
            dest : initData.jspubbase,
            base : initData.jslocalbase
            // isTest : initData.buildtype == "TEST",
            // zipDest : initData.zippath,
            // cdnversion : initData.cdnversion,
            // htmlversion : initData.htmlversion,
            // htmlTrunkPath : initData.localtrunkpath
        }
    }

    setOutPutData (data) {
        this.engine.setData(this.taskname,data);
    }
    execTask (inputData, outputData, cb) {
        console.time(this.taskname);
        var initData = this.engine.getData("BuildEngineInitData");
        var _this = this;
        var md5Map = {};
        var outPutFileList = [];
        var globalVersion = {};
        var destPath = common.getJsDest();
        var cssList = [];
        var tplList = [];
        var count = 0;
        var total = 0;

        var checkIsOther = function (filePath) {
            filePath = normalize(filePath);
            var data = [...global.otherFile.css];
            for (var i = 0; i < data.length; i++) {
                if (data[i].indexOf(filePath) !== -1) {
                    return true;
                }
            }
            return false;
        };

        var doEnd = function () {
            count++;
            if (total !== count) {
                return;
            }

            _this.setOutPutData({
                jsResult: inputData.jsResult,
                md5Map: md5Map,
                outPutFileList: outPutFileList
            });
            cb();
            console.timeEnd(_this.taskname);           
        };

        if (inputData.src.length === 0) {
            total = 1;
            doEnd();
            return;            
        }

        var isCDN = inputData.src[0].indexOf('htdocs') !== 0;
        var rebaseTo = '';

        if (isCDN) {
            rebaseTo = inputData.src[0].replace(/htdocs.*/, 'htdocs');
        }

        inputData.src.map(value => {
            if (value.endsWith('.css')) {
                cssList.push(value);
            }
            if (value.endsWith('.tpl')) {
                tplList.push(value);
            }
        });

        // if (initData.buildtype === "TEST") {
        //     cssList = cssList.concat([...global.otherFile.css]);
        //     cssList = new Set(cssList);
        //     cssList = [...cssList];
        // }

        if (cssList.length > 0) {
            total++;
            gulp.src(cssList, {
                base: inputData.base
            })
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                var contents = file.contents.toString();
                if (global.nonModPack) {
                    contents = contents.replace(/url\s*\(([^()]*)\)/gi, function (all, g1) {
                        g1 = g1.replace(/['"]/g, '');

                        if (g1.startsWith('data')) {
                            return all;
                        }
                        var srcPath = path.dirname(g1);
                        var srcName = path.basename(g1);
                        if (g1.startsWith('//') || g1.startsWith('http')) { // todo 外部资源会有问题
                            g1 = g1.replace(global.cdnRegExp, '');
                            g1 = path.join(initData.jslocalbase, g1);
                        } else if (g1.startsWith('.')) {
                            g1 = path.join(file.path.replace(/[^\/\\]*?$/, ''), g1);
                        } else {
                            g1 = path.join(initData.jslocalbase, g1.replace(/\/?res/, ''));
                        }

                        g1 = g1.replace(/[#?].*$/, ''); // todo /a/b/c/#d.js?v=20190124 就会有问题

                        srcName = srcName.replace(/[#?].*$/, '');

                        if (!fs.pathExistsSync(g1)) {
                            global.sLog('资源文件不存在: ' + g1, 3);
                            return all;
                        } else {
                            global.sLog('资源文件: '  + g1, 1);
                            global.otherFile.images.add(g1);
                            if (!global.md5File) {
                                return all;
                            }
                            srcName = srcName.replace(/\.([^.]*)$/, function (subAll, subG1) {
                                global.otherFileMd5[normalize(g1)] = md5File.sync(g1).slice(0, 16);
                                return '.' + global.otherFileMd5[normalize(g1)] + '.' + subG1;
                            });
                            return 'url(' + srcPath + '/' + srcName + ')';
                        }
                    });
                }
                var md5Val = md5.caculateMd5Version(contents);
                md5Map[common.getMd5Path(file.path)] = md5Val;
                file.contents = new Buffer(contents);
                callback(null, file);                    
            }))  
            .pipe(cleanCss({
                rebase: true,
                rebaseTo: rebaseTo
            }))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                var contents = file.contents.toString();
                var tmpPath = normalize(file.path);
                var nameId = tmpPath.replace(inputData.base, '').replace(/^\//, '');
                // contents = contents.replace(/[']/g, '"');
                if (isCDN) {
                    contents = contents.replace(/\((\/?res.*?)\)/g, function (all, g1) {
                        var cdnroot = global.initData.cdnroot.replace('https://', '').replace('http://', '');
                        return '(' + '//' + normalize(path.join(cdnroot, g1)) + ')';
                    });
                }
                contents = contents.replace(/([\\])/g, '\\$1');
                contents = contents.replace(/(['"])/g, '\\$1');    
                file.contents = new Buffer('define("' + nameId + '", [], function (require, exports, module) {\n' + '\tdust.loadCacheCss(\'' + nameId + '\', \'' + contents + '\');\n' + '});');
                callback(null, file);
            }))  
            .pipe(save('handle1'))
            .pipe(save('handle2'))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                file.path = file.path + '.js';
                callback(null, file);                
            })) 
            .pipe(gulp.dest(destPath))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                outPutFileList.push(file.path);
                callback(null, file);
            })) 
            .pipe(save.restore('handle1'))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                file.path = file.path.replace(/(\.css)$/, function (all, g1) {
                    return '.' + md5Map[common.getMd5Path(file.path)] + g1 + '.js'
                });
                callback(null, file);
            }))    
            .pipe(gulp.dest(destPath))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                outPutFileList.push(file.path);
                callback(null, file);
            })) 
            .pipe(save.restore('handle2'))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                var contents = file.contents.toString();
                var nameId;
                contents = contents.replace(rDefine, function (all, g1) {
                    g1.replace(/^['"](.*)['"]\s*,$/, function (all, g1) {
                        nameId = g1;
                    });
                    nameId = nameId + '-debug';
                    return 'define("' + nameId + '", ';
                });

                contents = contents.replace(/dust\.loadCacheCss\('(.*?)'/, function (all, g1) {
                    return 'dust.loadCacheCss(\'' + nameId + '\''; 
                });

                file.path = file.path + '-debug.js';
                file.contents = new Buffer(contents);
                callback(null, file);
            }))  
            .pipe(gulp.dest(destPath))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                outPutFileList.push(file.path);
                callback();
            }))
            .on('finish', function () { 
                doEnd();
            })
            .on('error', function(err){
                global.sLog('css模块文件构建报错: ' + JSON.stringify(err), 3, true);
            });
        }

        if (tplList.length > 0) {
            total++;
            gulp.src(tplList, {
                base: inputData.base
            })
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                var contents = file.contents.toString();
                if (global.nonModPack) {
                    contents = contents.replace(/<img.*?src\s*=\s*["'](.*?)["']/gi, function (all, g1) {
                        g1 = g1.replace(/['"]/g, '');

                        if (g1.startsWith('data')) {
                            return all;
                        }
                        var srcPath = path.dirname(g1);
                        var srcName = path.basename(g1);
                        if (g1.startsWith('//') || g1.startsWith('http')) { // todo 外部资源会有问题
                            g1 = g1.replace(global.cdnRegExp, '');
                            g1 = path.join(initData.jslocalbase, g1);
                        } else if (g1.startsWith('.')) {
                            g1 = path.join(file.path.replace(/[^\/\\]*?$/, ''), g1);
                        } else {
                            g1 = path.join(initData.jslocalbase, g1.replace(/\/?res/, ''));
                        }

                        g1 = g1.replace(/[#?].*$/, ''); // todo /a/b/c/#d.js?v=20190124 就会有问题

                        srcName = srcName.replace(/[#?].*$/, '');

                        if (!fs.pathExistsSync(g1)) {
                            global.sLog('资源文件不存在: ' + g1, 3);
                            return all;
                        } else {
                            global.sLog('资源文件: '  + g1, 1);
                            global.otherFile.images.add(g1);
                            if (!global.md5File) {
                                return all;
                            }
                            srcName = srcName.replace(/\.([^.]*)$/, function (subAll, subG1) {
                                global.otherFileMd5[normalize(g1)] = md5File.sync(g1).slice(0, 16);
                                return '.' + global.otherFileMd5[normalize(g1)] + '.' + subG1;
                            });
                            return 'url(' + srcPath + '/' + srcName + ')';
                        }
                    });
                    file.contents = new Buffer(contents);
                }
                callback(null, file);
            })) 
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                var contents = file.contents.toString();
                var md5Val = md5.caculateMd5Version(contents);
                md5Map[common.getMd5Path(file.path)] = md5Val;
                callback(null, file);
            }))  
            // .pipe(htmlmin({collapseWhitespace: true, caseSensitive: true}))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                var tmpPath = normalize(file.path);
                var contents = file.contents.toString();

                contents = contents.replace(/([\\])/g, '\\$1')
                                   .replace(/(['"])/g, '\\$1')
                                   .replace(/[\f]/g, "\\f")
                                   .replace(/[\b]/g, "\\b")
                                   .replace(/[\n]/g, "\\n")
                                   .replace(/[\t]/g, "\\t")
                                   .replace(/[\r]/g, "\\r")
                                   .replace(/[\u2028]/g, "\\u2028")
                                   .replace(/[\u2029]/g, "\\u2029");
                file.contents = new Buffer('define("' + tmpPath.replace(inputData.base, '').replace(/^\//, '') + '", [], function (require, exports, module) {\n' + '\treturn \'' + contents + '\';\n' + '});');
                callback(null, file);
            }))   
            .pipe(save('handle3'))
            .pipe(save('handle4'))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                file.path = file.path + '.js';
                callback(null, file);                
            })) 
            .pipe(gulp.dest(destPath))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                outPutFileList.push(file.path);
                callback(null, file);
            })) 
            .pipe(save.restore('handle3'))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                file.path = file.path.replace(/(\.tpl)$/, function (all, g1) {
                    return '.' + md5Map[common.getMd5Path(file.path)] + g1 + '.js'
                });
                callback(null, file);
            }))    
            .pipe(gulp.dest(destPath))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                outPutFileList.push(file.path);
                callback(null, file);
            })) 
            .pipe(save.restore('handle4'))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                var contents = file.contents.toString();
                contents = contents.replace(rDefine, function (all, g1) {
                    var name;
                    g1.replace(/^['"](.*)['"]\s*,$/, function (all, g1) {
                        name = g1;
                    });
                    return 'define("' + name + '-debug' + '", ';
                });
                file.path = file.path + '-debug.js';
                file.contents = new Buffer(contents);
                callback(null, file);
            }))  
            .pipe(gulp.dest(destPath))
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                outPutFileList.push(file.path);
                callback();
            }))
            .on('finish', function () { 
                doEnd();
            })
            .on('error', function(err){
                global.sLog('tpl模块文件构建报错: ' + JSON.stringify(err), 3, true);
            })
        }
    }
}

module.exports = VueTask;