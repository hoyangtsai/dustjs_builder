/**
 * @description 任务调度引擎
 * @author petergeng
 * @date 2017-03-06
 */
var Orchestrator = require('orchestrator');

class BuildEngine{
    constructor(){
      this.orchestrator = new Orchestrator();
      this.tasklistInstance = new Map();
      this.enginedata = new Map(); //引擎执行过程中产生的数据，都放到这个map中，通过key-value获取设置数据
      this.onError();
    }
    setData(key, value){
      this.enginedata.set(key,value);
    }
    getData(key){
      return this.enginedata.get(key);
    }
    /**
     * 启动引擎，开始执行任务
     */
    start(callback){
      var _this = this;
      let task = Array.from(this.tasklistInstance.keys());
      this.orchestrator.start(task,function(err){
          callback && callback(err);
      });
    }
    /**
     * 所有任务完成后回调
     * @param  {[type]} err [description]
     * @return {[type]}     [description]
     */
    finished(err){

    }
    /**
     * 停止执行任务
     */
    stop(){

    }

    addTaskToOrch(taskName, depend){
        let isHasTask = this.orchestrator.hasTask(taskName);
        depend = depend || [];
        let eg = this;
        if(!isHasTask){
            this.orchestrator.add(taskName,depend,function(callback){
                eg.tasklistInstance.get(taskName).exec(callback);
            });
        }
    }

    /**
     * 添加任务可以是单个任务或任务列表，依赖关系已处理
     */
    addTask(tasklist){
        if(tasklist instanceof Set){
            for(let item of tasklist){
                let taskName = item.getTaskName();
                let taskDepend = item.getDepend();
                this.addTaskToOrch(taskName,taskDepend);
                this.tasklistInstance.set(taskName,item);
            }
        }else{
            let taskName = tasklist.getTaskName();
            let taskDepend = tasklist.getDepend();
            this.addTaskToOrch(taskName,taskDepend);
            this.tasklistInstance.set(taskName,tasklist);
        }
    }

    /**
     * 错误监听
     */

     onError(){
        this.orchestrator.on('err',function(err){
            process.send && process.send({type : 'error', msg : 'build engine err', deital : err});
            console.dir(err);
            console.log("engine err" + err);
        });
     }

    toString(){ 
        return this;
    }
}

module.exports = BuildEngine