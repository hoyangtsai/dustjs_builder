/**
 * @description 任务超类
 * @author petergeng
 * @date 2017-03-06
 */

class Task{
    constructor(taskname,engine,depend){
        this.taskname = taskname; //任务名唯唯一标识
        this.engine = engine;
        this.depend = depend || new Set;  //依赖项
    }
    /**
     * [sendMessage description]
     * @param  {[type]} type     begin|end
     * @param  {[type]} msg      信息
     * @param  {[type]} taskname 任务名
     * @return {[type]}          [description]
     */
    sendMessage(type,msg,taskname){
        process.send && process.send({type : type, msg : msg,taskname : taskname});
        console.log(type + msg + taskname);
    }
    sendError(obj){
        process.send && process.send({type : 'error', msg : obj.msg, detail : obj.detail});
    }
    /**
     * 添加依赖项
     * @param {string || set} tasklist
     */
    addDepend(tasklist){
        if(tasklist instanceof Set){
            for(let item of tasklist.values()){
               this.depend.add(item);
            }
        }else{
            this.depend.add(tasklist);
        }
    }
    /**
     * 获取当前任务依赖项
     * @return {Array} 返回当前依赖项的字符串数组
     */
    getDepend(){
        return Array.from(this.depend);
    }
    /**
     * 获取任务名称
     * @return {String} [description]
     */
    getTaskName(){
        return this.taskname;
    }
    /**
     * 获取任务输入数据
     * @return {[type]} [description]
     */
    getInputData(){
        return this.getEngineData();
    }

    /**
     * 任务输出数据
     */

     setOutPutData(data){
        console.log('setOutPutData');
     }

    /**
     * 任务执行入口
     * @return {[type]} [description]
     */
    async exec(cb){
        if(typeof this.execTask == 'function'){
            let _this = this;
            await _this.sendMessage("begin","begin",_this.taskname);
            // await this.execTask(this.getInputData(), this.setOutPutData, function(){
            //     _this.sendMessage("finish","finish",_this.taskname);
            //     cb();
            // });
            await this.execTask(this.getInputData(), this.setOutPutData, () => {
                cb();
            });
            await _this.sendMessage("finish","finish",_this.taskname);
        }else{
            console.log("task no execTask method:" + this.taskname);
        }
    }
    /**
     * 设置调度执行引擎, 方便数据传递
     * @param {[type]} engine [description]
     */
    setEngine(engine){
        this.engine = engine;
    }
    /**
     * 获取当前引擎
     * @return {[type]} [description]
     */
    getEngine(){
        return this.engine;
    }

    getEngineData(){
        return this.engine.enginedata;
    }

    /**
     * console任务信息
     * @return {[type]} [description]
     */
    toString(){ 
        return this.taskname;
    }
}

module.exports = Task