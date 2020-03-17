/**
 * @description 任务超类
 * @author petergeng
 * @date 2017-03-06
 */
var Task = require("../tasks/Task");
var parseEngine = require('./index');
var esprima = require('esprima');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var fs = require('fs-extra');
var iduri = require("./iduri");
var path = require('path');
var normalize = require('normalize-path');

class ParseTask extends Task{
    constructor(taskname,engine,depend){
        super(taskname,engine,depend);
    }
    getInputData(){
        console.time(this.taskname);
        let inputdata = [];
        return this.engine.getData("htmldependjspraser");
        //return "F:/dev_branches/cdn_dev/htdocs/res/mqq/credit_v2/js/accredit/index.js";
    }
    setOutPutData(data){
        console.timeEnd(this.taskname);
        console.log(data);
        this.engine.setData(this.taskname,data);
    }
    /**
     * 任务执行入口
     * @return {[type]} [description]
     */
    execTask(inputData,outputData,cb){
        var _this = this;
        var initData = this.engine.getData("BuildEngineInitData");
        var result = [];
        let outdata = new Map();
        let size = inputData.size-1;

        var getLogData = function (resultMap) {
            var checkMap = {};
            
            resultMap.forEach(function (value, key, map) {
                checkMap[key] = {
                    root: [...value.root],
                    sync: [...value.sync],
                    deps: {}
                };
                value.deps.forEach(function (value2, key2, map2) {
                    checkMap[key].deps[key2] = [...value2]
                });
            });

            global.sLog('依赖模块数据:\n' + JSON.stringify(checkMap, null ,4), 1);
        };

        function callBack(){
            if(size <= 0){
                getLogData(outdata);
                _this.setOutPutData(outdata)
                cb();
            }else{
                size--;
            }
        }
        
        if (global.version === '1.0.0') {
            for(let [key,value] of inputData){
                (function(key,value){
                    parseEngine.parseList(value, initData, function(result){
                        outdata.set(key,result)
                        callBack();
                    },function(err){
                        global.sLog('依赖关系树解析报错:\n' + JSON.stringify(err), 3, true);
                        // _this.sendError({msg : '依赖关系树解析', detail : err});
                    });
                })(key,value)
            } 
            return;  
        }

        var checkVuePath = function (filePath) {
            if (/.css$|.tpl$/.test(filePath)) {
                return true;
            }
            return false;
        };

        var addModExt = function (filePath) {
            if (!/\.js$/.test(filePath) && !checkVuePath(filePath)) {
                return filePath += ".js";
            }
            return filePath;
        };

        var checkOuterPath = function (filePath) {
            if (filePath.startsWith('//') || filePath.startsWith('http')) {
                return true;
            }
            return false;
        };

        var checkASTValue = function (node, property, value) {
            var propertys = property.split('.');
            var reg = /^\d+$/;
            for (var i = 0; i < propertys.length; i++) {
                var val;
                if (i === (propertys.length - 1)) {
                    val = reg.test(propertys[i]) ? node[parseInt(propertys[i], 10)] : node[propertys[i]];
                    if (!value && (val || typeof val === false)) {
                        return true;
                    } else if (val === value) {
                        return true;
                    }
                } else if ((val = (reg.test(propertys[i]) ? node[parseInt(propertys[i], 10)] : node[propertys[i]]))) {
                    node = val;
                } else {
                    return false;
                }
            }
            return false;
        };

        var formatData = function () {
            let resultMap = new Map();

            var walkData = function (requiresData, modData, parentPath) {
                requiresData.forEach(function (itemData) {
                    if (itemData.isAsync) {
                        modData.sync.add(itemData.filePath);
                        walkData(itemData.requires, modData, itemData.filePath);
                    } else {
                        var depsSet = modData.deps.get(parentPath);
                        if(typeof depsSet == "undefined"){
                            depsSet = new Set();
                            depsSet.add(itemData.filePath);
                            modData.deps.set(parentPath, depsSet);
                        }else{
                            depsSet.add(itemData.filePath);
                        }
                        walkData(itemData.requires, modData, parentPath);
                    }
                });
            };   

            result.forEach(function (itemData) {
                var modData = {
                    root : new Set(), //入口js
                    sync : new Set(), //sync加载列表
                    deps : new Map()  //入口（或sync）依赖项，key：入口（sync），value set 依赖项
                };    

                itemData.requires.forEach(function (itemData) {
                    modData.root.add(itemData.filePath);
                    walkData(itemData.requires, modData, itemData.filePath);
                });

                resultMap.set(itemData.filePath, modData);
            });

            _this.setOutPutData(resultMap);

            getLogData(resultMap);

            cb();
        };

        var eachRequireCount = 0;

        var parseMod = function (filePath, selfObj, history) {
            if (!fs.pathExistsSync(filePath)) {
                global.sLog('模块路径不存在: ' + filePath, 3, true);
            }
            eachRequireCount++;

            if (eachRequireCount > 1500) {
                console.log(filePath);
                global.sLog('模块可能相互引用了: ' + filePath, 3, true);
            }
            
            var content = fs.readFileSync(filePath);
            var ast;
            try {
                ast = esprima.parseScript(content.toString()); 
            } catch (e) {
                global.sLog('语法错误: ' + filePath + '|lineNumber:' + e.lineNumber + '|' + e.description, 3, true);
            }
            
            var initMod = function (filePath, value, selfObj, isAsync) {
                var childObj = {}, childPath;
                childObj.value = value;

                if (checkOuterPath(childObj.value)) {
                    childObj.type = 'outer';
                    childPath = childObj.value;
                } else {
                    childPath = iduri.absolute(filePath, childObj.value);
                    childPath = addModExt(childPath);

                    if (global.fitTheme && childPath && childPath.indexOf('fitTheme') !== -1) {
                        var fitDirPath = path.join(initData.jslocalbase, '/g/fit-ui/components/component');
                        var fitReqPath = path.join(global.fitTheme, childPath.replace('fitTheme', ''));
                        
                        childPath = normalize(path.join(fitDirPath, fitReqPath));
                    }

                    if (!fs.pathExistsSync(childPath)) {
                        global.sLog('模块路径不存在: ' + childPath, 3, true);
                    }
                    
                    if (checkVuePath(childPath)) {
                        childObj.type = 'vue';
                    } else {
                        childObj.type = 'js';
                    }                                 
                }

                childObj.isAsync = isAsync || false;
                childObj.filePath = childPath;
                childObj.requires = [];

                selfObj.requires.push(childObj);

                if (childObj.type === 'js') {
                    if (history.includes(childObj.filePath)) {
                        if (global.modReference) {
                            global.sLog('模块相互引用了： ' + childObj.filePath + '\n请在以下模块中找到相互引用：\n' + history.join('\n'), 3);
                            // return;
                        } else {
                            global.sLog('模块相互引用了： ' + childObj.filePath + '\n请在以下模块中找到相互引用：\n' + history.join('\n'), 3, true);
                        }
                    } else {
                        parseMod(childPath, childObj, history.concat(childPath));
                    }
                }
            };

            estraverse.traverse(ast, {
                enter: function (node, parent) {
                    if (node.type === 'CallExpression') {
                        if (checkASTValue(node, 'callee.name', 'require')) {
                            initMod(filePath, node.arguments[0].value, selfObj);
                        }
                    } else if (node.type === 'MemberExpression') {
                        if (checkASTValue(node, 'object.name', 'require') && checkASTValue(node, 'property.name', 'async')) {
                            if (parent.arguments[0]) {
                                if (parent.arguments[0].elements && parent.arguments[0].elements.length > 0) {
                                    parent.arguments[0].elements.forEach(function (val) {
                                        initMod(filePath, val.value, selfObj, true);
                                    });
                                } else if (parent.arguments[0].value) {
                                    initMod(filePath, parent.arguments[0].value, selfObj, true);
                                }
                            }
                        }
                    }
                },
                leave: function (node, parent) {
                }
            });
        };
        
        for(let [key,value] of inputData){
            (function(key,value){
                var selfObj = {
                    filePath: key,
                    type: 'html',
                    requires: []
                };
                
                value.forEach(function (filePath) {
                    if (!fs.pathExistsSync(filePath)) {
                        global.sLog('入口JS不存在: ' + filePath, 3, true);
                    }
                    global.sLog('解析入口JS: ' + filePath, 1);
                    eachRequireCount = 0;
                    var childObj = {
                        filePath: filePath,
                        type: '',
                        requires: []
                    };

                    filePath = addModExt(filePath);

                    if (checkOuterPath(filePath)) {
                        childObj.type = 'outer';
                    } else if (checkVuePath(filePath)) {
                        childObj.type = 'vue';
                    } else {
                        childObj.type = 'js';
                    }
                    // selfObj.requires = [];
                    selfObj.requires.push(childObj);  

                    if (childObj.type === 'js') {
                        parseMod(filePath, childObj, [filePath]);    
                    }                                  
                });
                result.push(selfObj);
                // var ast = esprima.parseScript(content.toString()); 

            })(key,value)
        }      
        formatData();

        // fs.writeJsonSync('./test.json', result, {
        //     spaces: 4
        // });
    }
}

module.exports = ParseTask