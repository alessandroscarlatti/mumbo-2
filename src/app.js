const {performShellCommandInAppDir} = require("./utils");

class App {
    set client(client) {
        this._client = client;

        setTimeout(() => {
            this._client.doSomething();
        }, 2000)
    }

    println(text) {
        console.log(text);
    }

    doSomethingThenAlert(cbObj) {
        console.log("doSomething...");
        setTimeout(() => {
            console.log("...then alert!");
            cbObj.alert("stuff the backend sent");
            cbObj.alert2("stuff the backend sent");
        }, 1000)
    };

    runShellCommand1(cb) {
        performShellCommandInAppDir("doSomething.bat", [], cb)
    }
}

module.exports = App;