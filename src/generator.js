const Saxophone = require('saxophone');
const { setUpParserQueue } = require("./setUpParserQueue");

/**
 * A generator that, given an iterable source of XML, returns an async iterable
 * of the nodes of the XML.
 *
 * @param {object} options
 * @param {iterable} source
 */
exports.xmlNodeGenerator= async function* xmlNodeGenerator(options, source) {
    if (arguments.length == 1) {
        source = options;
        options = {};
    }

    const parser = new Saxophone();

    const getQueuedNodes= setUpParserQueue(options, parser);
    for (let node of getQueuedNodes()) {
        yield node
    }

    for await (const chunk of source) {
        if (!parser.write(chunk)) {
            for await (const node of getQueuedNodes()) {yield node}
            await new Promise((resolve) => {
                parser.once('drain', resolve);
            })
        }
        for await (const node of getQueuedNodes()) yield node
    }
    for await (const node of getQueuedNodes()) yield node
}