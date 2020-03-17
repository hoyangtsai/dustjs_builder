/**
 * 构建流程入口
 */
const BuildEngine = require("./build/buildengine");
const HtmlPraser = require("./build/file/parse");
const JsPraser = require("./build/modelparse/ParseTask");
const CodeParser = require("./build/file/code");
const VueParser = require("./build/file/vue");
const VersionParser = require("./build/file/version");
const RelationParser = require("./build/file/relation");
const InsertParser = require("./build/file/insert");
const ZipTask = require("./build/ziptask/");
const common = require("./build/util/common");

class MainBuild {
    constructor(initdata, finished) {
        this.buildEngine = new BuildEngine();
        this.initdata = common.formatInitData(initdata || {});
        this.buildEngine.setData("BuildEngineInitData", initdata);
        this.initTask();
    }
    initTask() {
        let htmlPraser = new HtmlPraser("htmldependjspraser", this.buildEngine);
        let jsPraser = new JsPraser("jsdependpraser", this.buildEngine);
        let vueParser = new VueParser("vuepraser", this.buildEngine);
        let codeParser = new CodeParser("jscodepraser", this.buildEngine);
        let versionParser = new VersionParser("versionparser", this.buildEngine);
        let relationParser = new RelationParser("relationparser", this.buildEngine);
        let insertParser = new InsertParser("insertparser", this.buildEngine);
        
        let zipTask = new ZipTask('testzipcode', this.buildEngine);

        jsPraser.addDepend("htmldependjspraser");
        vueParser.addDepend("jsdependpraser");
        codeParser.addDepend("vuepraser");
        versionParser.addDepend("jscodepraser");
        relationParser.addDepend("versionparser");
        insertParser.addDepend("relationparser");

        zipTask.addDepend('insertparser');

        this.buildEngine.addTask(jsPraser);
        this.buildEngine.addTask(htmlPraser);
        this.buildEngine.addTask(vueParser);
        this.buildEngine.addTask(codeParser);
        this.buildEngine.addTask(versionParser);
        this.buildEngine.addTask(relationParser);
        this.buildEngine.addTask(insertParser);

        this.buildEngine.addTask(zipTask);
    }
    async start(callback) {
        await this.buildEngine.start(callback);
    }
}

module.exports = MainBuild