/**
 * @description 任务调度引擎-测试
 * @author petergeng
 * @date 2017-03-06
 */
var BuildEngine = require('../index');
var ParseTask = require('../../modelparse/ParseTask');

var b = new BuildEngine();
/*//var t = new Task("task-a",new Set(['task-b','task-c','task-d']));
var t = new Task("task-a");
b.addTask(t);
b.start();*/

var c = new ParseTask("task-c");

var t = new ParseTask("task-t");

console.log(t);
b.addTask(c);
b.addTask(t);
b.start();