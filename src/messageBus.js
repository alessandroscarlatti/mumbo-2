let _messageBusIdCounter = 0;

class FunctionPointerLib {

    constructor(size) {
        this._functionPointerLib = {};
        this._functionPointerLibTtlQueue = [];
        this._maxFuncCount = size;
    }

    set maxFuncCount(maxFuncCount) {
        this._maxFuncCount = maxFuncCount;
    }

    put(key, func) {
        // Check to see if the lib is at capacity.
        // If so, purge the oldest function pointer.
        if (this._functionPointerLibTtlQueue.length === this._maxFuncCount) {
            let funcKeyToDelete = this._functionPointerLibTtlQueue.shift();
            delete this._functionPointerLib[funcKeyToDelete];
        }

        this._functionPointerLib[key] = func;
        this._functionPointerLibTtlQueue.push(key);
    }

    get(key) {
        return this._functionPointerLib[key];
    }
}

class MessageBus {

    constructor() {
        this._functionPointerLib = new FunctionPointerLib(1000);
        this._functionPointerCounter = 0;
        this._createProxySubscriber();
        this._id = "MessageBus@" + _messageBusIdCounter;
        _messageBusIdCounter++;
    }

    set send(sendFunc) {
        this._send = sendFunc;
    }

    set subscriber(objSubscriber) {
        this._objSubscriber = objSubscriber;
    }

    set functionPointerLibSize(size) {
        this._functionPointerLib.maxFuncCount = size;
    }

    _createProxySubscriber() {
        const subscriberHandler = {
            get: (obj, prop) => {
                if (this._functionPointerLib.get(prop) != null) {
                    return this._functionPointerLib.get(prop);
                } else if (this._objSubscriber != null) {
                    return this._objSubscriber[prop];
                } else {
                    throw new Error("Cannot find property " + prop + " on subscriber.");
                }
            }
        };

        this._proxySubscriber = new Proxy({}, subscriberHandler);
    }

    /**
     * @return {Proxy} Return the proxy publisher.
     */
    get publisher() {
        if (this._proxyPublisher == null) {
            // we need for this publisher to be able to intercept method calls.
            const self = this;

            const publisherHandler = {
                get: function (obj, prop) {
                    // when the publisher is asked for a property...
                    // return a function that actually forwards to the _send method?

                    // are we assuming that the caller will only ask for a function property?  I think so.
                    // we can only provide a response asynchronously, anyway.
                    return function () {
                        // turn this function into a message object.

                        let argDefs = self._dehydrateArgs(arguments);

                        let message = {
                            type: "function",
                            name: prop,
                            args: argDefs
                        };

                        let messageJson = JSON.stringify(message);

                        self._send(messageJson);
                    }
                }
            };

            this._proxyPublisher = new Proxy({}, publisherHandler);
        }

        return this._proxyPublisher;
    }

    /**
     * Called on receiving a message.
     * The message is an object in the official format.
     * For example:
     * {
     *  type: "function",
     *  name: "getPenguinName",
     *  args: [
     *      {
     *          type: "function",
     *          name: "f@12345"
     *      }
     *  ]
     * }
     * @param {Object} messageJson
     */
    receive(messageJson) {
        console.log(this._id + " received message", messageJson);

        let message = JSON.parse(messageJson);

        // declare function library
        let functionLibrary = {};

        // create args
        const args = this._hydrateArgs(message.args, functionLibrary);

        try {
            this._proxySubscriber[message.name](...args);
        } catch (e) {
            console.log(e);
        }
    }

    /**
     * Transform argument definitions (just function arguments for now) from their message format
     * into first-class JavaScript functions which actually
     * point to the other message bus.
     *
     * @param arrArgDefs
     * @param functionLibrary
     * @return {Array}
     * @private
     */
    _hydrateArgs(arrArgDefs, functionLibrary) {
        // just accepting a function argument right now.
        let args = [];
        arrArgDefs.forEach(argDef => {
            var arg = this._hydrateArg(argDef);
            args.push(arg)
        });

        // now we have the args!
        return args;
    }

    /**
     * Take a single argument definition and hydrate it into
     * an actual JS object instance.
     * @param argDef
     * @private
     */
    _hydrateArg(argDef) {
        const self = this;
        switch (argDef.type) {
            case "function":
                return function () {
                    let dehydratedArgs = self._dehydrateArgs(arguments);

                    let message = {
                        type: "function",
                        name: argDef.name,
                        args: dehydratedArgs
                    };

                    let messageJson = JSON.stringify(message);

                    self._send(messageJson);
                };
            case "string":
                return String(argDef.value);
            case "number":
                return Number(argDef.value);
            case "boolean":
                return Boolean(argDef.value);
            case "json":
                return JSON.parse(argDef.value);
            case "object":
                let objArg = {};
                for (let prop in argDef.properties) {
                    if (argDef.properties.hasOwnProperty(prop)) {
                        objArg[prop] = this._hydrateArg(argDef.properties[prop]);
                    }
                }
                return objArg;
            case "array":
                let arrArg = [];
                argDef.elements.forEach(element => {
                    arrArg.push(this._hydrateArg(element));
                });
                return arrArg;
            default:
                throw new Error("Unhandled argument type: " + argDef.type);
        }
    }

    /**
     * Turn a concrete array of argument JS objects
     * into argument definition objects.
     *
     * @param jsObjArgs
     * @return {Array}
     * @private
     */
    _dehydrateArgs(jsObjArgs) {
        let dehydratedArgs = [];
        for (let i = 0; i < jsObjArgs.length; i++) {
            let arg = jsObjArgs[i];
            let dehydratedArg = this._dehydrateArg(arg);
            dehydratedArgs.push(dehydratedArg);
        }
        return dehydratedArgs;
    }

    /**
     * Take a single actual arg instance and turn it into a single definition.
     * @param arg
     * @private
     */
    _dehydrateArg(arg) {
        if (typeof arg === "string") {
            return ({
                type: "string",
                value: String(arg)
            });
        } else if (typeof arg === "function") {
            // store a pointer to the function in the function lib
            let functionPointerName = "f@" + this._functionPointerCounter;
            this._functionPointerCounter++;
            this._functionPointerLib.put(functionPointerName, arg);
            return ({
                type: "function",
                name: functionPointerName
            });
        } else if (typeof arg === "number") {
            return ({
                type: "number",
                value: arg
            });
        } else if (typeof arg === "boolean") {
            return ({
                type: "boolean",
                value: arg
            })
        } else if (typeof arg === "object") {

            if (arg.constructor.name === "Array") {
                let argDef = {
                    type: "array",
                    elements: [],
                };

                arg.forEach(element => {
                    argDef.elements.push(this._dehydrateArg(element));
                });

                return argDef;
            } else {
                let argDef = {
                    type: "object",
                    properties: {},
                };

                for (let prop in arg) {
                    if (arg.hasOwnProperty(prop)) {
                        argDef.properties[prop] = this._dehydrateArg(arg[prop]);
                    }
                }

                return argDef;
            }

            // return ({
            //     type: "json",
            //     value: JSON.stringify(arg)
            // })
        } else {
            throw new Error("Unsupported argument type for arg: " + arg)
        }
    }
}

module.exports = MessageBus;