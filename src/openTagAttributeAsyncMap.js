const Saxophone = require('saxophone');

/**
 * An asynchronous mapping of the outup of xmlNodeGenerator that
 * parses the attribute string into an object for open tags.
 * Effectively converts an iterator of XML nodes where the attritributes
 * of open tags are unparsed strings into an interator where the
 * open tag attributes are mapped into a key/value object.
 *
 * @param {iterator} source xmlNodeGenerator or an asynchronous mapping thereof
 */
exports.openTagAttributeAsyncMap= async function* openTagAttributeAsyncMap(source) {
    for await (const tuple of source) {
        if (Array.isArray(tuple) && tuple.length > 2 && tuple[0] == 'tagopen') {
            let astr = tuple[2];
            if (astr.match(/^\s*$/)) {
                // empty attribute string
                tuple[2] = {};
            }
            else {
                // parse attribute string
                tuple[2] = Saxophone.parseAttrs(astr);
            }
        }
        yield tuple
    }
}