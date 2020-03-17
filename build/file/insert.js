/**
 * 插入
 * @name insert
 * @author devonwen
 */

var fs = require('fs-extra');
var Task = require('../tasks/Task');
var gulp = require('gulp');
var through2 = require('through2');
var util = require('gulp-util');
var path = require('path');
var gulpZip = require('gulp-zip');
var common = require('../util/common');
var md5File = require('md5-file');
var normalize = require('normalize-path');
var useref = require('useref');

class InsertTask extends Task {
    constructor (taskname, depend) {
        super(taskname, depend);
    }
    getInputData () {
        let initData = this.engine.getData('BuildEngineInitData');
        return {
            filesList : this.engine.getData('relationparser'),
            zipDest : initData.zippath,
            isTest : initData.buildtype == "TEST",
            htmlTrunkPath : initData.repoType !== 'git' ? initData.localtrunkpath : initData.localsrcpath,
            htmlversion : initData.htmlversion
        }
    }
    setOutPutData (data) {
    }
    // getFilePath(filePath){
    //     var inputData = this.getInputData();
    //     var result = '';
    //     var zipDest = inputData.zipDest;
    //     var isTest = inputData.isTest;
    //     var htmlTrunkPath = inputData.htmlTrunkPath;
    //     var htmlversion = inputData.htmlversion;
    //     if(inputData.isTest){
    //         result = path.dirname(filePath.replace(htmlTrunkPath, path.join(zipDest, htmlversion , '/main/')))
    //     }else{
    //         result = path.dirname(filePath);
    //     }
    //     return result;
    // }
    execTask (inputData, outputData, cb) {
        console.time(this.taskname);
        var _this = this;
        var filesList = inputData.filesList;
        var handleData = Object.keys(filesList);
        var initData = this.engine.getData("BuildEngineInitData");
        var count = 0;
        var cdnList = new Set();

        var nonModList = [...global.otherFile.js, ...global.otherFile.css, ...global.otherFile.images];

        nonModList.forEach(function (val) {
            val = normalize(val);
            if (val.indexOf(initData.repoType !== 'git' ? initData.localtrunkpath : initData.localsrcpath) !== -1) {
                global.otherFile.page.add(val);
            } else if (val.indexOf(initData.jslocalbase) !== -1) {
                cdnList.add(val);
            } else {
                global.sLog('无法打包的资源文件: ' + val);
            }
        });

        var packOther = function () {
            if (initData.versionPath) {
                var versionPathList = initData.versionPath.split('|');    
                versionPathList.forEach(function (val) {
                    global.otherFile.page.add(path.join(val, ''));                   
                }); 
            }
            global.sLog('initData.versionPath: ' + initData.versionPath, 3);
            var pageList = [...global.otherFile.page];
            cdnList = [...cdnList]
            var _count = 0;
            var total = 0;

            if (pageList.length > 0) {
                total = total + pageList.length;
            }

            if (cdnList.length > 0 && global.nonModPack) {
                total++;
            }

            if (_count === total) {

                _this.setOutPutData(null);
                console.timeEnd('构建耗时');
                cb();
                console.timeEnd(_this.taskname); 
                return;
            }

            if (pageList.length > 0) {
                pageList.forEach(function (val) {
                    gulp.src(val)
                    .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                        var content = file.contents.toString();
                        if (normalize(file.path).indexOf('vtools') !== -1) {

                        } else {
                            content = content.replace(/<script(.*?)src\s*=\s*["'](.*?)["']|<link(.*?)href\s*=\s*["'](.*?)["']|<img(.*?)src\s*=\s*["'](.*?)["']/gi, function (all, g1, g2, g3, g4, g5, g6) {
                                var resourcePath, srcPath, type, srcName;

                                    if (g2 || g4 || g6) {
                                        if (g2) {
                                            type = 1;
                                            resourcePath = g2;
                                        }

                                        if (g4) {
                                            type = 2;
                                            resourcePath = g4;
                                        }

                                        if (g6) {
                                            type = 3;
                                            resourcePath = g6;
                                        }

                                        if (resourcePath.startsWith('data')) {
                                            return all;
                                        }

                                        var getFilePreContent = function () {
                                            if (type === 1) {
                                                return "<script" + (g1 || '') + 'src=';
                                            } else if (type === 2) {
                                                return "<link" + (g3 || '') + 'href=';
                                            } else {
                                                return "<img" + (g5 || '') + 'src=';
                                            }
                                        };

                                        resourcePath = resourcePath.replace(/[#?].*$/, '');

                                        srcPath = path.dirname(resourcePath);
                                        srcName = path.basename(resourcePath);

                                        if (resourcePath.startsWith('//') || resourcePath.startsWith('http')) {
                                            resourcePath = resourcePath.replace(global.cdnRegExp, '');
                                            resourcePath = path.join(initData.jslocalbase, resourcePath);
                                        } else {
                                            resourcePath = path.join(initData.repoType !== 'git' ? initData.localtrunkpath : initData.localsrcpath, resourcePath);     
                                        }

                                        if (!fs.pathExistsSync(resourcePath)) {
                                            return all;
                                        } else {
                                            if (!global.md5File) {
                                                return all;
                                            }
                                            srcName = srcName.replace(/\.([^.]*)$/, function (subAll, subG1) {
                                                global.otherFileMd5[normalize(resourcePath)] = md5File.sync(resourcePath).slice(0, 16);
                                                return '.' + global.otherFileMd5[normalize(resourcePath)] + '.' + subG1;
                                            });
                                            return getFilePreContent() + '"' + srcPath + '/' + srcName + '"';
                                        }
                                    } else {
                                        return all;
                                    }
                            });
                            content = useref(content);
                            content = content[0];

                            global.sLog('file.path: ' + file.path, 3);
                            global.sLog('initData.htmlversion: ' + initData.htmlversion, 3);
                            if (initData.versionPath && initData.htmlversion && initData.htmlversion.indexOf('V3.') !== -1) {
                                content = content.replace(/(<!--\s*\[VERSIONPATH-START\]\s*-->)([\s\S]*?)(<!--\s*\[VERSIONPATH-END\]\s*-->)/gi, function (all, g1, g2, g3) {
                                    console.log(initData.htmlversion);
                                    global.sLog('initData.htmlversionSrc: ' + initData.htmlversionSrc, 3);
                                    return 'var G_UI_VERSION = "' + initData.htmlversionSrc.match(/V3\.[a-zA-Z0-9]*/)[0] +'"' + '\n\t';
                                });
                            }

                            file.contents = new Buffer(content);
                        }
                        
                        callback(null, file);
                    }))
                    .pipe(gulp.dest(common.getHtmlDestPath(val)))
                    .on('finish', function () { 
                        _count++;
                        if (_count === total) {
                            _this.setOutPutData(null);
                            console.timeEnd('构建耗时');
                            cb();
                            console.timeEnd(_this.taskname);
                        }
                    })
                    .on('error', function(err){
                        global.sLog('版本插入报错' + JSON.stringify(err), 3, true);
                    });
                });
            }

            if (cdnList.length > 0  && global.nonModPack) {
                gulp.src(cdnList, {
                    base: initData.jslocalbase
                })
                .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                    var filePath = normalize(file.path);
                    var srcPath = path.dirname(filePath);
                    var srcName = path.basename(filePath);
                    if (global.otherFileMd5[filePath]) {
                        srcName = srcName.replace(/\.([^.]*)$/, function (subAll, subG1) {
                            return '.' + global.otherFileMd5[filePath] + '.' + subG1;
                        });                        
                    } else {
                        srcName = srcName.replace(/\.([^.]*)$/, function (subAll, subG1) {
                            global.otherFileMd5[filePath] = md5File.sync(filePath).slice(0, 16);
                            return '.' + global.otherFileMd5[filePath] + '.' + subG1;
                        });                        
                    }

                    if (global.md5File) {
                        file.path = path.join(srcPath, srcName);
                    }

                    callback(null, file);
                }))
                .pipe(gulp.dest(common.getJsDest()))
                .on('finish', function () { 
                    _count++;
                    if (_count === total) {
                        _this.setOutPutData(null);
                        console.timeEnd('构建耗时');
                        cb();
                        console.timeEnd(_this.taskname);
                    }
                })
                .on('error', function(err){
                    global.sLog('版本插入报错' + JSON.stringify(err), 3, true);
                });               
            }

        };

        handleData.forEach(function (val) {
            gulp.src(val)
            .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
                var content = file.contents.toString();
                content = content.replace(/(<!--\s*\[VERSION-START\]\s*-->)([\s\S]*?)(<!--\s*\[VERSION-END\]\s*-->)/gi, function (all, g1, g2, g3) {
                    return g1 + '\n\t\t' + filesList[val] + '\n\t' + g3;
                });

                if (global.nonModPack) {
                    content = content.replace(/<script(.*?)src\s*=\s*["'](.*?)["']|<link(.*?)href\s*=\s*["'](.*?)["']|<img(.*?)src\s*=\s*["'](.*?)["']/gi, function (all, g1, g2, g3, g4, g5, g6) {
                        var resourcePath, srcPath, type, srcName;

                            if (g2 || g4 || g6) {
                                if (g2) {
                                    type = 1;
                                    resourcePath = g2;
                                }

                                if (g4) {
                                    type = 2;
                                    resourcePath = g4;
                                }

                                if (g6) {
                                    type = 3;
                                    resourcePath = g6;
                                }

                                if (resourcePath.startsWith('data')) {
                                    return all;
                                }

                                var getFilePreContent = function () {
                                    if (type === 1) {
                                        return "<script" + (g1 || '') + 'src=';
                                    } else if (type === 2) {
                                        return "<link" + (g3 || '') + 'href=';
                                    } else {
                                        return "<img" + (g5 || '') + 'src=';
                                    }
                                };

                                resourcePath = resourcePath.replace(/[#?].*$/, '');

                                srcPath = path.dirname(resourcePath);
                                srcName = path.basename(resourcePath);

                                if (resourcePath.startsWith('//') || resourcePath.startsWith('http')) {
                                    resourcePath = resourcePath.replace(global.cdnRegExp, '');
                                    resourcePath = path.join(initData.jslocalbase, resourcePath);
                                } else {
                                    resourcePath = path.join(initData.repoType !== 'git' ? initData.localtrunkpath : initData.localsrcpath, resourcePath);     
                                }

                                if (!fs.pathExistsSync(resourcePath)) {
                                    return all;
                                } else {
                                    if (!global.md5File) {
                                        return all;
                                    }
                                    srcName = srcName.replace(/\.([^.]*)$/, function (subAll, subG1) {
                                        global.otherFileMd5[normalize(resourcePath)] = md5File.sync(resourcePath).slice(0, 16);
                                        return '.' + global.otherFileMd5[normalize(resourcePath)] + '.' + subG1;
                                    });
                                    return getFilePreContent() + '"' + srcPath + '/' + srcName + '"';
                                }
                            } else {
                                return all;
                            }
                    });
                }
                content = useref(content);
                content = content[0];
                file.contents = new Buffer(content);
                callback(null, file);
            }))
            .pipe(gulp.dest(common.getHtmlDestPath(val)))
            .on('finish', function () { 
                count++;
                if (count === handleData.length) {
                    if (global.nonModPack || initData.repoType === 'git') {
                        packOther();
                    } else {
                        _this.setOutPutData(null);
                        console.timeEnd('构建耗时');
                        cb();
                        console.timeEnd(_this.taskname); 
                    } 
                }
            })
            .on('error', function(err){
                global.sLog('版本插入报错' + JSON.stringify(err), 3, true);
            });
        });
    }
}

module.exports = InsertTask;