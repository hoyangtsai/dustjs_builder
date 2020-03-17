/**
 * 代码md5、transport、压缩、debug文件任务
 * @name code
 * @author devonwen
 */
var Task = require('../tasks/Task');
var gulp = require('gulp');
var seajsTransport = require('./lib/transport/index');
var uglify = require('gulp-uglify');
var save = require('gulp-save');
var through2 = require('through2');
var normalize = require('normalize-path');
var common = require('../util/common');
var util = require('gulp-util');
var md5 = require('../util/version');
var path = require('path');
var ast = require('cmd-util').ast;
// var rDefine = /define\(\s*(['"](.+?)['"],)?/;
var fs = require('fs-extra');
var babel = require('gulp-babel');
var vueRender = require('./vue-render');
var versionPath;
const os = require('os');

// var getPath = function (path) {
//     path = normalize(path);
//     path = path.replace(new RegExp('.*?res/'), '');
//     path = path.replace(new RegExp('[^/]*$'), '');
//     return path;
// };

class CodeTask extends Task {
    constructor (taskname, engine, depend) {
        super(taskname, engine, depend);
    }
    getInputData () {
        var result = [];
        var inputData = this.engine.getData("jsdependpraser");
        var vueData = this.engine.getData("vuepraser");
        var initData = this.engine.getData("BuildEngineInitData");
        // Array.from(new Set(oldAstSeaModule.dependencies || []));
        common.handleRelation(inputData);

        result = Array.from(new Set(vueData.jsResult || []));

        // inputData.forEach(function (value, key, map) {
        //     var rootJsSet = value.root;
        //     var syncJsSet = value.sync;
        //     var depsMap = value.deps;   
        //     var entr = new Set([...rootJsSet, ...syncJsSet]);
        //     for(let item of entr.keys()){
        //         let depsSet = depsMap.get(item);
        //         if(depsSet && depsSet.size > 0){
        //             result = result.concat([...depsSet]);
        //         }
        //     }        
        //     result = result.concat([...entr]);   
        // });

        // result = result.filter(value => {
        //     if (value.endsWith(".css") || value.endsWith(".tpl")) {
        //         return false;
        //     } 
        //     return true;
        // });

        result = result.map(value => {
            if(value.endsWith(".js")){
                return value;
            }
            return value + ".js";
        });

        return {
            src : Array.from(new Set(result)),
            dest : initData.jspubbase,
            base : initData.jslocalbase,
            srcmd5: false,
            isTest : initData.buildtype == "TEST",
            // zipDest : initData.zippath,
            cdnversion : initData.cdnversion,
            htmlversion : initData.htmlversion,
            htmlTrunkPath : initData.repoType !== 'git' ? initData.localtrunkpath : initData.localsrcpath,
            md5Map: vueData.md5Map,
            outPutFileList: vueData.outPutFileList
        }
    }

    setOutPutData (data) {
        this.engine.setData(this.taskname,data);
    }
    execTask (inputData, outputData, cb) {
        console.time(this.taskname);
        var _this = this;
        var initData = this.engine.getData("BuildEngineInitData");
        var md5Map = inputData.md5Map || {};
        var outPutFileList = inputData.outPutFileList || [];
        var globalVersion = {};
        var destPath = common.getJsDest();

        inputData.src = inputData.src.filter(function (val) {
            if (/^(https?|\/\/)/.test(val)) {
                md5Map[val] = (new Date()).getTime();
                return false;
            }
            return true;
        });

        var globalVersionPath = common.getVerisonPath();

        global.sLog('版本文件_global.version地址: ' + globalVersionPath, 3);

        if (fs.pathExistsSync(globalVersionPath)) {
            if (!global.buildPage) {
                globalVersion = fs.readFileSync(globalVersionPath);
                globalVersion = JSON.parse(globalVersion);
            } else {
                global.sLog('单页面版本构建', 3);
            }
        } else {
            global.sLog('版本文件_global.version地址不存在', 3);
        }

        var ignoreList = [];

        gulp.src(inputData.src, {
            base: inputData.base
        })
        .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
            var contents = file.contents.toString();
            var ignore = false;
            contents.replace(/(.*?)define\s*?\(.*?\{/, function (all, g1) {
                g1 = g1.replace(/\s*/g, '');
                if (g1) {
                    ignore = true;
                }
            });
            if (ignore) {
                global.sLog('非标准dust模块: ' + file.path, 3);
                ignoreList.push(file.path);
            }
            callback(null, file); 
            
        }))
        .pipe(global.version === '2.0.0' ? babel({
            presets: [['@babel/env', {
                // debug: true,
                modules: false,
                exclude: ['transform-function-name'],
                
                // loose: true
                // useBuiltIns: 'usage'
            }]],
            ignore: ignoreList
            // comments: false
            // plugins: ['@babel/transform-runtime']
        }) : util.noop())
        .pipe(global.version === '2.0.0' ? through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
            var contents = file.contents.toString();

            if (ignoreList.includes(file.path)) {
                callback(null, file);
            } else {
                contents = vueRender.transformRender(file.path, contents);
                contents = contents.replace(/([\s\S]*?)define\s*?\(.*?\{/, function (all, g1) {
                    if (g1) {
                        return 'define(function(require, exports, module) {' + '\n' + g1;
                    }
                    return all;
                });
                file.contents = new Buffer(contents);
                callback(null, file);
            }
        })  : util.noop())
        .pipe(save('src'))
        .pipe(seajsTransport())
        .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
            var contents = file.contents.toString(); 
            contents = ast.modify(contents, function(v) {
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
            contents = contents.print_to_string({
                beautify: true,
                comments: true
            });

            if (!inputData.srcmd5) {
                md5Map[file.path] = md5.caculateMd5Version(contents);
            }
            
            if (!inputData.isTest && !inputData.srcmd5 && globalVersion && md5Map[file.path] === globalVersion[normalize(file.path).replace(new RegExp('.*?res'), '/res')]) {
                global.sLog('版本相同不构建: ' + file.path, 3);
                callback(null);
            } else {
                file.contents = new Buffer(contents);
                if (path.extname(file.path) === '.js') {
                    file.path = file.path.replace(/([^/\\]*)\.js$/, function (all, g1) {
                        return g1 + '-debug.js';
                    });
                }

                callback(null, file); 
            } 
            
        }))
        .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
            var contents = file.contents.toString();
            file.contents = new Buffer(common.handleDefineDepends(contents, file.path.replace(/-debug\.js$/, '.js'), true));
            callback(null, file);
        })) 
        .pipe(gulp.dest(destPath))
        .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
            outPutFileList.push(file.path);
            callback(null, file);
        }))  
        .pipe(save.restore('src'))
        .pipe(inputData.srcmd5 ? util.noop() : through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
            if (!inputData.isTest && globalVersion && md5Map[file.path] === globalVersion[normalize(file.path).replace(new RegExp('.*?res'), '/res')]) {
                callback(null);
            } else {
                callback(null, file);
            } 
        }))
        // .pipe(save('backsrc'))
        // .pipe(inputData.isTest ? gulp.dest(common.getTestDestPath(true)) : util.noop())
        // .pipe(save.restore('backsrc'))
        .pipe(seajsTransport())
        .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
            var contents = file.contents.toString();
            if (file.path.indexOf('jsencrypt') !== -1 && /^\//.test(os.homedir())) {
                if (!global.openBuildJsencrypt) {
                    global.sLog('MAC下不能构建jsencrypt文件: ' + file.path, 3, true);
                } else {
                   global.sLog('你在MAC下构建了jsencrypt文件，请验证好构建后的jsencrypt模块' + file.path, 3); 
                    file.contents = new Buffer(common.handleDefineDepends(contents, file.path));
                    callback(null, file);
                }
                
            } else {
                file.contents = new Buffer(common.handleDefineDepends(contents, file.path));
                callback(null, file);
            }
        })) 
        .pipe(uglify())
        .pipe(save('uglify'))
        .pipe(gulp.dest(destPath))
        .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
            outPutFileList.push(file.path);
            callback(null, file);
        })) 
        .pipe(save.restore('uglify'))
        .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
            file.path = file.path.replace(/([^/\\]*)\.js$/, function (all, g1) {
                return g1 + '.' + md5Map[file.path] + '.js';
            });
            callback(null, file);
        }))
        .pipe(gulp.dest(destPath))
        .pipe(through2.obj({highWaterMark: 50000}, function(file, enc, callback) {
            outPutFileList.push(file.path);
            callback();
        }))
        .on('finish', function () { 
            common.formatMd5Map(md5Map);
            _this.setOutPutData({
                md5Map: md5Map,
                versionPath: inputData.isTest ? common.getTestIncludePath() : common.getVerisonPath(),
                globalVersion: globalVersion,
                outPutFileList : outPutFileList
            });
            cb();
            console.timeEnd(_this.taskname);
        })
        .on('error', function(err){
            global.sLog('JS模块构建报错: ' + JSON.stringify(err), 3, true);
        });
    }
}

module.exports = CodeTask;