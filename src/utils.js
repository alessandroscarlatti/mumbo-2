const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;

/***********************************************
 * Shell Command utility functions.
 ***********************************************/

/**
 * Add any missing callbacks.
 * @param cb
 * @return {*}
 * @private
 */
function _provideMissingCallbacks(cb) {
    if (cb == null) {
        cb = {}
    }

    if (cb.failed == null)
        cb.failed = () => {};
    if (cb.started == null)
        cb.started= () => {};
    if (cb.completed == null)
        cb.completed= () => {};
    if (cb.stdout == null)
        cb.stdout= () => {};
    if (cb.stderr == null)
        cb.stderr= () => {};

    return cb;
}

/**
 * Execute a shell command only if it is located within the working directory.
 * @param executable
 * @param args
 * @param cb the object with callbacks.
 */
function performShellCommandInAppDir(executable, args, cb) {

    cb = _provideMissingCallbacks(cb);

    let executablePath = path.normalize(
        path.join(__dirname, executable)
    );

    if (path.isAbsolute(executablePath) && executablePath.startsWith(__dirname)) {
        fs.access(executablePath, fs.constants.R_OK, function (err) {
            if (err == null) {
                performShellCommandInNewShell(executablePath, args, cb);
            } else {
                console.error("Unable to access executable: " + executablePath);
                cb.failed("Unable to access executable: " + executablePath);
            }
        });
    } else {
        console.error("Bad executable path: " + executablePath);
        cb.failed("Unable to access executable." + executablePath);
    }
}

/**
 * Execute a shell command at the given path with the given args.
 * @param executablePath
 * @param args
 * @param cb
 */
function performShellCommandInNewShell(executablePath, args, cb) {
    cb = _provideMissingCallbacks(cb);

    console.log(`Executing ${executablePath} with args ${args}`);
    let proc;
    try {
        //fix args if args are empty
        if (args == null) {
            args = [];
        }
        // add space to title so it is always quoted on the command line so that start doesn't get mixed up.
        proc = spawn("cmd", ["/c", "start", "Mumbo Shell Command ", "cmd", "/c", executablePath, ...args], {
            shell: false, // if false, there will be no stdout or stderr
            detached: true,
        });
    } catch (e) {
        console.error("Error starting process for executable:", executablePath, e);
        cb.failed("Error starting process for executable:" + executablePath);
        return;
    }

    console.log(`Started Process PID ${proc.pid} at ${new Date()}`);
    cb.started();

    proc.on("close", function () {
        console.log(`Completed Process PID ${proc.pid} at ${new Date()}`);
        cb.completed();
    });

    proc.stdout.on("data", function (data) {
        cb.stdout(data.toString());
    });

    proc.stderr.on("data", function (data) {
        cb.stderr(data.toString());
    });
}

module.exports = {
    performShellCommandInNewShell,
    performShellCommandInAppDir,
};