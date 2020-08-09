const Saxophone = require('saxophone');
const { Transform } = require('stream');
class OpenTagAttributeParser extends Transform {
    constructor(options) {
        super(Object.assign({}, options, { readableObjectMode: true, writableObjectMode: true }));
    }

    _transform(chunk, encoding, callback) {
        if (Array.isArray(chunk) && chunk.length > 2 && chunk[0] == 'tagopen') {
            let astr = chunk[2];
            if (astr.match(/^\s*$/)) {
                // empty attribute string
                chunk[2] = {};
            }
            else {
                chunk[2] = Saxophone.parseAttrs(astr);
            }
            this.push(chunk);
            callback();
        }
        else {
            this.push(chunk);
            callback();
        }
    }
}

exports.OpenTagAttributeParser= OpenTagAttributeParser