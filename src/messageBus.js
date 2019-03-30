let _messageBusIdCounter = 0;

class MessageBus {

    constructor() {
        this._functionPointerLib = {};
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

    _createProxySubscriber() {
        const subscriberHandler = {
            get: (obj, prop) => {
                if (this._functionPointerLib[prop] != null) {
                    return this._functionPointerLib[prop];
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
     * @param arrArgs
     * @param functionLibrary
     * @return {Array}
     * @private
     */
    _hydrateArgs(arrArgs, functionLibrary) {
        // just accepting a function argument right now.
        let args = [];
        arrArgs.forEach(objArg => {
            var arg = null;
            const self = this;
            switch (objArg.type) {
                case "function":
                    arg = function () {
                        let dehydratedArgs = self._dehydrateArgs(arguments);

                        let message = {
                            type: "function",
                            name: objArg.name,
                            args: dehydratedArgs
                        };

                        let messageJson = JSON.stringify(message);

                        self._send(messageJson);
                    };
                    break;
                case "string":
                    arg = String(objArg.value);
                    break;
                case "number":
                    arg = Number(objArg.value);
                    break;
                case "boolean":
                    arg = Boolean(objArg.value);
                    break;
                case "json":
                    arg = JSON.parse(objArg.value);
                    break;
                default:
                    throw new Error("Unhandled argument type: " + objArg.type);
            }
            args.push(arg)
        });

        // now we have the args!
        return args;
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
            if (typeof arg === "string") {
                dehydratedArgs.push({
                    type: "string",
                    value: String(arg)
                });
            } else if (typeof arg === "function") {
                // store a pointer to the function in the function lib
                let functionPointerName = "f@" + this._functionPointerCounter;
                this._functionPointerCounter++;
                this._functionPointerLib[functionPointerName] = arg;
                dehydratedArgs.push({
                    type: "function",
                    name: functionPointerName
                });
            } else if (typeof arg === "number") {
                dehydratedArgs.push({
                    type: "number",
                    value: arg
                });
            } else if (typeof arg === "boolean") {
                dehydratedArgs.push({
                    type: "boolean",
                    value: arg
                })
            } else if (typeof arg === "object") {
                dehydratedArgs.push({
                    type: "json",
                    value: JSON.stringify(arg)
                })
            } else {
                throw new Error("Unsupported argument type for arg: " + arg)
            }
        }
        return dehydratedArgs;
    }
}

/**
 * This is an in-memory implementation.
 * It directly invokes the other messageBus's event handling
 * by directly calling MessageBus#onMessage.
 */
function inMemoryPublisherImpl(otherMessageBus) {
    function send(message) {
        // simulate network latency
        setTimeout(() => {
            console.log(this._id + " sending message", message);
            otherMessageBus.receive(message);
        }, 500);
    }

    return send;
}

module.exports = {
    MessageBus: MessageBus,
    inMemoryPublisherImpl: inMemoryPublisherImpl,
};