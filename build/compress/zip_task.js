/**
 * zip操作
 * @name parse
 * @author michaelzhu
 */
var Task = require('../tasks/Task');
var zip = require('zip');

class FtpTask extends Task {
    constructor (taskname, depend) {
        super(taskname, depend);
    }
    getInputData () {
        // data说明
        // zip dirPath, outPath
        return [{
            type:"",//zip
            data:[]
        }]
    }
    setOutPutData (data) {
        console.log(this.taskname + " : exec finished" + data);
        console.dir(data);
    }
    execTask (inputData, outputData, cb) {
    	var type = inputData.type || null;
        var data = inputData.data || null;
        if(type && data){
            switch(type){
                case "zip":
                    _this._dispatch(type,data,2);
                    break;
            }            
        }
        else{
            console.log("参数错误");
        }
    }
    _dispatch(type,data,arg_length){
        if(data.length == arg_length){
            svn[type].apply(svn,data).then(function(){
                _this.setOutPutData(null);
            })
        }
        else{
            console.log("参数错误");
        }
    }
}

module.exports = FtpTask;