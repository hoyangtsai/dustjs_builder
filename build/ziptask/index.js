/**
 * 代码md5、transport、压缩、debug文件任务
 * @name code
 * @author devonwen
 */

const util = require('../util/util');
const Task = require('../tasks/Task');
const gulp = require('gulp');
const zip = require('gulp-zip');
// const zip = require('gulp-vinyl-zip');
const through2 = require('through2');
const dirTree = require('directory-tree');
var gulpUtil = require('gulp-util');
const os = require('os');
const exec = require('child_process').execSync; 
const fs = require('fs-extra'); 
var path = require('path');

class ZipTask extends Task {
    constructor (taskname, engine, depend) {
        super(taskname, engine, depend);
    }
    getInputData () {
        var initData = this.engine.getData("BuildEngineInitData");
        var jsCodeData = this.engine.getData('jscodepraser');
        return {
            dest : initData.jspubbase,
            base : initData.jslocalbase,
            isTest : initData.buildtype == "TEST",
            zipDest : initData.zippath,
            cdnversion : initData.cdnversion,
            htmlversion : initData.htmlversion,
            htmlTrunkPath : initData.localtrunkpath,
            jsFileList : jsCodeData.outPutFileList
        }
    }
    setOutPutData (data) {
        this.engine.setData(this.taskname,data);
    }
    getHTMLFileList(path){
        path.replace(/\\/g,'/');
        var result = [];
        let treedata = dirTree(path);
        function showTreeNode(children){
            var item;
            for(var i = 0; i < children.length; i++){
                item = children[i];
                if(item.extension){
                    result.push(item.path);
                }
                showTreeNode(item.children || []);
            }
        }
        showTreeNode(treedata.children || []);
        return result;
    }
    execTask (inputData, outputData, cb) {
        let isTest = inputData.isTest;
        if(!isTest){
            cb();
            return ;
        }
        let _this = this;
        let htmlFileList = this.getHTMLFileList(inputData.zipDest + '/' + inputData.htmlversion + '/');
        console.time(this.taskname);

        if (/^\//.test(os.homedir())) {
            gulp.src(htmlFileList,{ base: inputData.zipDest + '/' + inputData.htmlversion + '/'})
            .pipe(gulp.dest('./'))
            .on('error', function (err) {
                _this.sendMessage({err : err});
                cb();
                console.timeEnd(_this.taskname);
            })
            .on('finish', function () {
                exec('zip -r ' + path.join(inputData.zipDest, util.getVersionAndModule(inputData.htmlversion) + '.zip') + ' ./main -x "__MACOSX" -x "*.DS_Store"', {maxBuffer: 1024 * 10000});
                exec('rm -rf ./main', {maxBuffer: 1024 * 10000});
                gulp.src(inputData.jsFileList,{ base: inputData.zipDest + '/' + inputData.cdnversion + '/'})
                .pipe(gulp.dest('./'))
                .on('finish', function () {
                    exec('zip -r ' + path.join(inputData.zipDest, util.getVersionAndModule(inputData.cdnversion) + '.zip') + ' ./main -x "__MACOSX" -x "*.DS_Store"', {maxBuffer: 1024 * 10000});
                    exec('rm -rf ./main', {maxBuffer: 1024 * 10000});
                    _this.setOutPutData({});
                    cb();
                    console.timeEnd(_this.taskname);
                })
                .on('error', function (err) {
                    _this.setOutPutData({});
                    _this.sendMessage({err : err});
                    cb();
                    console.timeEnd(_this.taskname);
                });

            })
        } else {
            gulp.src(htmlFileList,{ base: inputData.zipDest + '/' + inputData.htmlversion + '/'})
            .pipe(zip(util.getVersionAndModule(inputData.htmlversion) + '.zip'))
            .pipe(gulp.dest(inputData.zipDest))
            .on('error', function (err) {
                _this.sendMessage({err : err});
                cb();
                console.timeEnd(_this.taskname);
            })
            .on('finish', function () {             
            })

            gulp.src(inputData.jsFileList,{ base: inputData.zipDest + '/' + inputData.cdnversion + '/'})
            .pipe(zip(util.getVersionAndModule(inputData.cdnversion) + '.zip'))
            .pipe(gulp.dest(inputData.zipDest))
            .on('finish', function () {
                _this.setOutPutData({});
                cb();
                console.timeEnd(_this.taskname);
            })
            .on('error', function (err) {
                _this.setOutPutData({});
                _this.sendMessage({err : err});
                cb();
                console.timeEnd(_this.taskname);
            });           
        }
    }
}

module.exports = ZipTask;