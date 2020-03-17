/**
 * 解析入口文件
 * @name parse
 * @author devonwen
 */

var Task = require('../tasks/Task');
var gulp = require('gulp');
var through2 = require('through2');
var path = require('path');
var common = require('../util/common');
var fs = require('fs-extra');
var normalize = require('normalize-path');
var cfg = require('../config/cfg.json');
// var cdnJSON = require('../config/cdn.json');
// var version = require('../config/version.json');
var log4js = require('log4js');
var moment = require('moment');

var __init = function () {
    var logFileName = moment().format('YYYY-MM-DD HH-mm-ss');
    var currentDay = moment().format('YYYY-MM-DD');
    var dirTree = require('directory-tree');

    global.buildPage = global.buildPage || cfg.buildPage;
    global.modReference = global.modReference || cfg.modReference;
    global.version = global.version || cfg.version;
    global.nonModPack = global.nonModPack || cfg.nonModPack;
    global.md5File = global.md5File || cfg.md5File;
    global.openBuildJsencrypt = global.openBuildJsencrypt || cfg.openBuildJsencrypt;
    global.logFileName = logFileName + '.log';

    global.versionPath = null;
    global.testDestPath = null;
    global.testIncludePath = null;

    var cdnJSON = (global.cdn || cfg.cdn).map(function (val) {
        return '.*?' + val + '/res';
    });

    var cdnRegExp = new RegExp(cdnJSON.join('|') + '');

    global.cdnRegExp = cdnRegExp;

    log4js.configure({
      appenders: { buildLog: { type: 'file', filename: global.logPath ? path.join(global.logPath, global.logFileName) : path.join(__dirname, '../log/' + global.logFileName) } },
      categories: { default: { appenders: ['buildLog'], level: 'info' } }
    });

    var logger = log4js.getLogger('buildLog');

    global.logger = logger;

    global.otherFile = {
        page: new Set(),
        js: new Set(),
        css: new Set(),
        images: new Set()
    };

    global.otherFileMd5 = {};

    global.sLog = function (msg, type, isThrow) {
        if (type > 0) {
            global.logger.info(msg);
        }
        if (type > 1) {
            console.log(msg);
        }

        if (type > 2) {
            process.send && process.send({type : 'error', msg : msg});
        }
        if (isThrow) {
            throw new Error('error');       
        }
    };

    let treedata = dirTree(global.logPath ? global.logPath : path.join(__dirname, '../log/'));

    if (treedata.children.length > 0) {
      treedata.children.forEach(function (item) {
        if (item.path.indexOf(currentDay) === -1) {
            fs.removeSync(item.path);
        }
      })      
    }
};

class ParseTask extends Task {
    constructor (taskname, engine, depend) {
        super(taskname, engine, depend);
    }
    getInputData () {
        let initData = this.engine.getData("BuildEngineInitData");
        let inputdata = {
            selectfiles : initData.selectfiles || [],
            jslocalbase : initData.jslocalbase || ""
        }
        return inputdata;
    }
    setOutPutData (data) {
        this.engine.setData(this.taskname,data);
    }
    execTask (inputData, outputData, cb) {
        console.time(this.taskname);
        __init();
        var data = new Map;
        var _this = this;
        var initData = this.engine.getData("BuildEngineInitData");

        global.buildPage = initData.projectkey.indexOf('buildPage') !== -1 ? true : global.buildPage;
        // var fitTheme;

        // __dirname：    获得当前执行文件所在目录的完整目录名
        // __filename：   获得当前执行文件的带有完整绝对路径的文件名
        // process.cwd()：获得当前执行node命令时候的文件夹目录名 
        
        var parsePage = function (content, filePath) {
            var fitTheme;
                // g1 inc
                // g2 inc
                // g3 inc
                // g4 js
                // g5 css
                // g6 fitTheme
                // g7 img
                content.replace(/<!--.*?virtual\s*=\s*["'](.*?)["']|<?cs.*?PARSE_PATH\s*\(\s*["'](.*?)['"]\)|<?cs.*?include\s*:\s*["'](.*?)['"]|<script.*?src\s*=\s*["'](.*?)["']|<link.*?href\s*=\s*["'](.*?)["']|[^/]{1}\s*fitTheme\s*:\s*["'](.*?)["']|<img.*?src\s*=\s*["'](.*?)["']/gi, function (all, g1, g2, g3, g4, g5, g6, g7) {
                    var nodePath, gPath, resourcePath, srcPath, isPage = true;
                    // if (fitTheme && initData.buildtype !== 'TEST') {
                    //     return;
                    // }

                    // if (initData.buildtype === 'TEST') {
                        if (global.nonModPack && (g4 || g5 || g7)) {
                            if (g4) {
                                resourcePath = g4;
                            }

                            if (g5) {
                                resourcePath = g5;
                            }

                            if (g7) {
                                resourcePath = g7;
                            }

                            resourcePath = resourcePath.replace(/[#?].*$/, '');

                            srcPath = resourcePath;

                            if (resourcePath.startsWith('//') || resourcePath.startsWith('http')) {
                                resourcePath = resourcePath.replace(global.cdnRegExp, '');
                                resourcePath = path.join(initData.jslocalbase, resourcePath);
                                isPage = false;
                            } else {
                                resourcePath = path.join(initData.repoType !== 'git' ? initData.localtrunkpath : initData.localsrcpath, resourcePath);     
                            }

                            if (!fs.pathExistsSync(resourcePath)) {
                                global.sLog('资源文件不存在: '  + resourcePath, 3);
                                return;
                            } else {
                                global.sLog('资源文件: '  + resourcePath, 1);
                            }

                            if (isPage) {
                                global.otherFile.page.add(resourcePath);
                            } else {
                                if (resourcePath.endsWith('.css')) {
                                    global.otherFile.css.add(normalize(resourcePath));
                                } else if (resourcePath.endsWith('.js')) {
                                    global.otherFile.js.add(resourcePath);
                                } else {
                                    global.otherFile.images.add(resourcePath);
                                }
                            }

                            return;
                        }
                    // }

                    if (g6 && g6.trim()) {
                        fitTheme = g6.trim();
                        if (!global.fitTheme) {
                            global.fitTheme = fitTheme;
                            global.sLog('fitTheme: '  + global.fitTheme, 3);
                        }
                        return;
                    }

                    if (g1 && g1.trim()) {
                        gPath = g1.trim();
                    } else if (g2 && g2.trim()) {
                        gPath = g2.trim();
                    } else if (g3 && g3.trim()) {
                        gPath = g3.trim();
                    }

                    if (gPath) {
                        nodePath = path.join(initData.repoType !== 'git' ? initData.localtrunkpath : initData.localsrcpath, gPath);                 
                        if (fs.pathExistsSync(nodePath)) {
                            if (normalize(nodePath).indexOf('inc/version') !== -1) {
                                return;
                            }
                            if (normalize(nodePath).indexOf('vtools') !== -1) {
                                return;
                            }
                            // if (initData.buildtype === 'TEST') {
                                global.otherFile.page.add(nodePath);
                            // }
                            if (normalize(nodePath).indexOf('vtools') !== -1 && initData.buildtype !== 'TEST') {
                                return;
                            }
                            global.sLog('解析inc页面: '  + nodePath, 1);
                            parsePage((fs.readFileSync(nodePath)).toString(), nodePath);
                        } else {
                            nodePath = path.join(initData.repoType !== 'git' ? initData.localtrunkpath : initData.localsrcpath, 'htdocs', gPath);
                            if (fs.pathExistsSync(nodePath)) {
                                if (normalize(nodePath).indexOf('inc/version') !== -1) {
                                    return;
                                }
                                // if (initData.buildtype === 'TEST') {
                                    global.otherFile.page.add(nodePath);
                                // }
                                if (normalize(nodePath).indexOf('vtools') !== -1 && initData.buildtype !== 'TEST') {
                                    return;
                                }
                                global.sLog('解析inc页面: '  + nodePath, 1);
                                parsePage((fs.readFileSync(nodePath)).toString(), nodePath);
                            } else {
                                global.sLog('inc页面不存在: '  + nodePath, 3);
                            }
                        }
                    }
                });

                // fs.writeJsonSync(filePath, content);
        };

        global.sLog('构建版本: '  + global.version, 3);
        global.sLog('buildPage: '  + global.buildPage, 3);
        global.sLog('md5File: '  + global.md5File, 3);
        global.sLog('nonModPack: '  + global.nonModPack, 3);
        // global.sLog('cdn: '  + cdnJSON, 3);
        global.sLog('构建参数:\n'  + JSON.stringify(initData, null, 4), 1);

        if (!inputData.selectfiles || inputData.selectfiles.length === 0) {
            global.sLog('没有要构建的文件', 3, true);
        }

        inputData.selectfiles.forEach(function (val) {
            if (!fs.pathExistsSync(val)) {
                global.sLog('构建页面不存在: '  + val, 3, true);
            }
        });

        gulp.src(inputData.selectfiles)
        .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
            var content = file.contents.toString();

            parsePage(content, file.path);

            content.replace(common.regExpMap.htmlJsEntry, function (all, g1, g2) {
                g2 = g2.replace(/\s|['"]/g, '').split(',');

                g2 = g2.map(function (val) {
                    val = /.js$/.test(val) ? val : (val + '.js');
                    val = path.join(inputData.jslocalbase, val); // 路径要求点
                    return val.replace(/\\/g,'/');
                });
                data.set(file.path, g2);
            });
           callback(null, file);
        })) 
        .on('finish', function () { 
            common.set('parseData', data);
            _this.setOutPutData(data);
            cb();
            console.timeEnd(_this.taskname);
        })
        .on('error', function(err){
            global.sLog('解析入口文件报错:\n'  + JSON.stringify(err), 3, true);
            // _this.sendError({msg : 'parse任务出错', detail : err});
        });
    }
}

module.exports = ParseTask;