const Saxophone = require('saxophone');
const { Transform } = require('stream');
const Queue = require('tiny-queue');
const { OpenTagAttributeParser } = require("./OpenTagAttributeParser");
exports.xmlNodeGenerator= require("./generator").xmlNodeGenerator

const { setUpParserQueue, AvailableNodes } = require("./setUpParserQueue");
exports.AvailableNodes= AvailableNodes

exports.Saxophone= Saxophone
exports.parseAttrs= Saxophone.parseAttrs
exports.parseEntities= Saxophone.parseEntities

exports.OpenTagAttributeParser= OpenTagAttributeParser

class XMLTransform extends Transform {
    constructor(options) {
        const opt = Object.assign({}, options);
        const parserOptions= {
            include: opt.include || AvailableNodes,
            noEmptyText: opt.noEmptyText,
            reportSelfClosing: opt.reportSelfClosing
        }
        delete opt.include
        delete opt.noEmptyText
        delete opt.reportSelfClosing
        super(Object.assign(opt, { readableObjectMode: true }));

        this.parser = new Saxophone(); // This object is a writable stream that will emit an event for each tag or node parsed from the incoming data

        this.getQueuedNodes= setUpParserQueue(parserOptions, this.parser)
    }
    _transform(chunk, encoding, callback) {
        new Promise((resolve,reject)=>{
            try {
                if (!this.parser.write(chunk,encoding)) {
                    this.parser.once('drain', resolve)
                }
                else {
                    resolve()
                }
            }
            catch (e) {
                reject(e)
            }
        })
        .then(()=>{
            callback(this._dumpQueue())
        })
        .catch(callback)
    }

    _dumpQueue() {
        for (const it of this.getQueuedNodes()) this.push(it)
        return null
    }

    _flush(callback) {
        this.parser.end((err)=>{
            if (err) {
                callback(err)
            } else {
                callback(this._dumpQueue());
            }
        })
    }
}

exports.XMLTransform = XMLTransform;
