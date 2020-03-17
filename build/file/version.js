/**
 * 生成_global.version
 * @name version
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

class VersionTask extends Task {
    constructor (taskname, engine, depend) {
        super(taskname, engine, depend);
    }
    getInputData () {
        var result = [];
        var inputData = this.engine.getData('jscodepraser');

        return inputData;
    }
    setOutPutData (data) {
        this.engine.setData(this.taskname,data);
    }
    execTask (inputData, outputData, cb) {
        console.time(this.taskname);
        var _this = this;
        var initData = this.engine.getData("BuildEngineInitData");
        
        var versionPath = inputData.versionPath;
        var generateVersionData = function (isObject) {
            var data = {};
            var md5Map = inputData.md5Map;
            for (var key in md5Map) {
                var innerKey = normalize(key);

                if (/^(https?|\/\/)/.test(key)) {
                    data[innerKey] = md5Map[key];
                    continue;
                }
                data[innerKey.replace(new RegExp('.*?res'), '/res')] = md5Map[key];
            }
            return isObject ? data : JSON.stringify(data);
        };
        var doEnd = function () {
            _this.setOutPutData({
                versionPath: versionPath
            });
            cb();
            console.timeEnd(_this.taskname);
        };

        if (global.buildPage) {
            doEnd();
            return;
        }

        fs.pathExists(common.getVerisonPath())
        .then(exists => {
            if (!exists) {
                fs.outputFile(versionPath, generateVersionData())
                .then((err, data) => {
                    if(err){
                        global.sLog('版本文件_global.version生成报错: ' + JSON.stringify(err), 3, true);
                    }
                    
                    doEnd();
                });
            } else {    
                var data = inputData.globalVersion;
                var appendData = generateVersionData(true);
                for (var key in appendData) {
                    data[key] = appendData[key];
                }
                fs.outputFile(versionPath, JSON.stringify(data))
                .then((err) => {
                    if(err){
                        global.sLog('版本文件_global.version生成报错: ' + JSON.stringify(err), 3, true);
                    }
                    doEnd();
                });
            }
        })
    }
}

module.exports = VersionTask;