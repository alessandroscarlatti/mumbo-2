var assert = require('assert');
const {MessageBus, inMemoryPublisherImpl} = require("./messageBus");
const mumbo = require("./mumbo");
const SocketServer = mumbo.require('ws').Server;

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
});