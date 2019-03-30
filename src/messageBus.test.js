var assert = require('assert');
const MessageBus = require("./messageBus");

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

describe('Message Bus', function () {
    it("invoke nullary function", function (done) {
        // create message buses
        const bus1 = new MessageBus();
        const bus2 = new MessageBus();

        // connect message buses
        bus1.send = inMemoryPublisherImpl(bus2);
        bus2.send = inMemoryPublisherImpl(bus1);

        // set up subscription
        bus2.subscriber = {
            printPenguinName: function () {
                console.log("printPenguinName()");
                done();
            }
        };

        // now bus2 receives a message.
        // bus2.onMessage(printPenguinNameMessage);
        bus1.publisher.printPenguinName();
    });

    it("invoke monadic function with string", function (done) {
        // create message buses
        const bus1 = new MessageBus();
        const bus2 = new MessageBus();

        // connect message buses
        bus1.send = inMemoryPublisherImpl(bus2);
        bus2.send = inMemoryPublisherImpl(bus1);

        // set up subscription
        bus2.subscriber = {
            printPenguinName: function (name) {
                console.log("Name was: " + name);
                assert.equal(name, "Phil");
                done();
            }
        };

        // now bus2 receives a message.
        // bus2.onMessage(printPenguinNameMessage);
        bus1.publisher.printPenguinName("Phil");
    });

    it("invoke dyadic function with number and boolean", function (done) {
        // create message buses
        const bus1 = new MessageBus();
        const bus2 = new MessageBus();

        // connect message buses
        bus1.send = inMemoryPublisherImpl(bus2);
        bus2.send = inMemoryPublisherImpl(bus1);

        // set up subscription
        bus2.subscriber = {
            printPenguinAgeAndSeniorCitizenStatus: function (age, isSeniorCitizen) {
                console.log("Age: " + age);
                console.log("Is Senior Citizen? " + isSeniorCitizen);
                assert.equal(age, 2);
                assert(!isSeniorCitizen);
                done();
            }
        };

        // now bus2 receives a message.
        // bus2.onMessage(printPenguinNameMessage);
        bus1.publisher.printPenguinAgeAndSeniorCitizenStatus(2, false);
    });

    it("invoke function with deep object", function (done) {
        // create message buses
        const bus1 = new MessageBus();
        const bus2 = new MessageBus();

        // connect message buses
        bus1.send = inMemoryPublisherImpl(bus2);
        bus2.send = inMemoryPublisherImpl(bus1);

        const originalPenguin = {
            name: "Phil",
            age: 2,
            isSeniorCitizen: false
        };

        // set up subscription
        bus2.subscriber = {
            printPenguinData: function (actualPenguin) {
                console.log("penguin: ", actualPenguin);
                assert.notEqual(actualPenguin, originalPenguin);
                assert.deepEqual(actualPenguin, originalPenguin);
                done();
            }
        };

        // now bus2 receives a message.
        // bus2.onMessage(printPenguinNameMessage);
        bus1.publisher.printPenguinData(originalPenguin);
    });

    it("invoke function with deep array", function (done) {
        // create message buses
        const bus1 = new MessageBus();
        const bus2 = new MessageBus();

        // connect message buses
        bus1.send = inMemoryPublisherImpl(bus2);
        bus2.send = inMemoryPublisherImpl(bus1);

        const originalPenguins = [
            {
                name: "Phil",
                age: 2,
                isSeniorCitizen: false
            },
            {
                name: "Annie",
                age: 3,
                isSeniorCitizen: true
            },
        ];

        // set up subscription
        bus2.subscriber = {
            printPenguinData: function (actualPenguins) {
                console.log("penguin: ", actualPenguins);
                assert.notEqual(actualPenguins, originalPenguins);
                assert.deepEqual(actualPenguins, originalPenguins);
                done();
            }
        };

        // now bus2 receives a message.
        // bus2.onMessage(printPenguinNameMessage);
        bus1.publisher.printPenguinData(originalPenguins);
    });

    it("call function with callback", function (done) {
        // create message buses
        const bus1 = new MessageBus();
        const bus2 = new MessageBus();

        // connect message buses
        bus1.send = inMemoryPublisherImpl(bus2);
        bus2.send = inMemoryPublisherImpl(bus1);

        // set up subscription
        bus2.subscriber = {
            getPenguinName: function (callback) {
                console.log("getPenguinName()");
                callback("Phil");
            }
        };

        // send a message with a callback
        // bus2.onMessage(getPenguinNameMessage)
        bus1.publisher.getPenguinName(name => {
            assert.equal(name, "Phil");
            done();
        });
    });

    it("call function with callback with callback!", function (done) {
        // create message buses
        const bus1 = new MessageBus();
        const bus2 = new MessageBus();

        // connect message buses
        bus1.send = inMemoryPublisherImpl(bus2);
        bus2.send = inMemoryPublisherImpl(bus1);

        // set up subscription
        bus2.subscriber = {
            getPenguinNameGetter: function (getterCallback) {
                getterCallback(valueCallback => {
                    console.log("getPenguinName()");
                    valueCallback("Phil");
                });
            }
        };

        // send a message with a callback that is function with a callback!
        // name getter is being called twice!
        bus1.publisher.getPenguinNameGetter(nameGetter => {
            nameGetter(name => {
                assert.equal(name, "Phil");
                done();
            });
        });
    });

    /**
     * This does not work yet!
     * That's because the current manner of serializing an "object"
     * is to use JSON.  This does not allow functions inside the object.
     * It would be great to be able to pass named callbacks,
     * especially for running asynchronous tasks.
     * However, this will require rewriting the message bus
     * serialization and deserialization to be recursive.
     */
    it("call function within an object param", function (done) {
        // create message buses
        const bus1 = new MessageBus();
        const bus2 = new MessageBus();

        // connect message buses
        bus1.send = inMemoryPublisherImpl(bus2);
        bus2.send = inMemoryPublisherImpl(bus1);

        // set up subscription
        bus2.subscriber = {
            printlnThenCallback: function (paramsObj) {
                console.log("println called.");
                paramsObj.cb();
            }
        };

        bus1.publisher.printlnThenCallback({
            cb: () => {
                console.log("called back!");
                done();
            }
        })
    });

    it("call with an array", function (done) {
        // create message buses
        const bus1 = new MessageBus();
        const bus2 = new MessageBus();

        // connect message buses
        bus1.send = inMemoryPublisherImpl(bus2);
        bus2.send = inMemoryPublisherImpl(bus1);

        // set up subscription
        bus2.subscriber = {
            doSomethingWithArray: function (arr) {
                assert.equal(arr.constructor.name,  "Array");
                assert.deepEqual(arr,  ["thing1", "thing2"]);
                done();
            }
        };

        bus1.publisher.doSomethingWithArray(["thing1", "thing2"])
    });

    /**
     * TODO (3/30/2019)
     * We also need a plan for re-implementing the function pointer library.
     * Right now, it will store every function pointer forever.
     * That is certainly not a good thing!
     * Since JavaScript for Browser does not have the concept of first-class
     * references, the best I can think of at the time is implementing the
     * library as a finite stack.  For example, a stack of 1000 function pointers max.
     * The oldest function pointers will be retired when the stack is full.
     */
    it("stores only the specified number of function pointers", function () {
        // create message buses
        const bus1 = new MessageBus();
        const bus2 = new MessageBus();

        // connect message buses
        bus1.send = inMemoryPublisherImpl(bus2);
        bus2.send = inMemoryPublisherImpl(bus1);

        bus2.subscriber = {
            doSomething: function (cb) {
                // we won't actually ever use the callback!
            }
        };

        // send five thousand requests, each with a function pointer.
        for (let i = 0; i < 5000; i++) {
            bus1.publisher.doSomething(() => {});
        }

        // now check that there are only the max number of
        // function pointers actually stored in the lib.
        assert.equal(bus1._functionPointerLib._functionPointerLibTtlQueue.length, 1000);
    })
});