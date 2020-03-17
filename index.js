const config = require("./config.json");
const Main = require("./main.js");

let main = new Main(config);
main.start()