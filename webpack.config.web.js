module.exports = {
    target: "node",
    entry: './src/messageBus.js',
    output: {
        filename: 'dist/messageBus.js',
        library: 'MessageBus',
        libraryTarget: 'var',
        path: __dirname
    },
    node: {
        __dirname: false  // allows __dirname to be used in bundled code
    }
};