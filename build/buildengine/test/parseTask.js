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

b.setData("BuildEngineInitData","F:/dev_branches/cdn_dev/htdocs/res/mqq/credit_v2/js/accredit/index.js");

var c = new ParseTask("modelparsetask",b);
b.addTask(c);

b.start();