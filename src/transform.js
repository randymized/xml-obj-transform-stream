const Saxophone = require('saxophone');
const { Transform } = require('stream');
const Queue = require('tiny-queue');
const { parse } = require('path');

const AvailableNodes= [
    'tagopen',
    'tagclose',
    'text',
    'cdata',
    'comment',
    'processinginstruction',
]
exports.AvailableNodes= AvailableNodes

exports.Saxophone= Saxophone
exports.parseAttrs= Saxophone.parseAttrs
exports.parseEntities= Saxophone.parseEntities


class XMLTransform extends Transform {
    constructor(options) {
        const opt = Object.assign({}, options);
        let optinclude = opt.include || AvailableNodes;
        if (!Array.isArray(optinclude)) optinclude= [optinclude]
        delete opt.include
        const optNoEmptyText = opt.noEmptyText
        delete opt.noEmptyText
        const optReportSelfClosing = opt.reportSelfClosing
        delete opt.reportSelfClosing
        super(Object.assign({}, opt, { readableObjectMode: true }));

        this.parser = new Saxophone(); // This object is a writable stream that will emit an event for each tag or node parsed from the incoming data

        this.queue = new Queue();
        const queue = this.queue;

        const wantsTagclose= optinclude.includes('tagclose')
        optinclude.forEach(include=>{
            switch (include) {
                case 'tagopen':
                    if (wantsTagclose) {
                        if (optReportSelfClosing) {
                            this.parser.on(include, obj => {
                                queue.push([include, obj.name, obj.attrs, obj.isSelfClosing])
                                if (obj.isSelfClosing) {
                                    queue.push(['tagclose',obj.name])
                                }
                            })
                        } else {
                            this.parser.on(include, obj => {
                                queue.push([include, obj.name, obj.attrs])
                                if (obj.isSelfClosing) {
                                    queue.push(['tagclose',obj.name])
                                }
                            })
                        }
                    }
                    else {
                        if (optReportSelfClosing) {
                            this.parser.on(include, obj => {
                                queue.push([include,obj.name,obj.attrs,obj.isSelfClosing])
                            })
                        } else {
                            this.parser.on(include, obj => {
                                queue.push([include,obj.name,obj.attrs])
                            })
                        }
                    }
                    break;
                case 'tagclose':
                    this.parser.on(include, obj => {
                        queue.push([include,obj.name])
                    })
                    break;
                case 'text':
                    if (optNoEmptyText) {
                        this.parser.on(include, obj => {
                            if (!/^\s*$/.test(obj.contents)) {
                                queue.push([include,obj.contents])
                            }
                        })
                    }
                    else {
                        this.parser.on(include, obj => {
                            queue.push([include,obj.contents])
                        })
                    }
                    break;
                case 'cdata':
                case 'comment':
                case 'processinginstruction':
                    this.parser.on(include, obj => queue.push([include,obj.contents]))
                    break;
            }
        })
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
        const queue = this.queue;
        while (queue.length > 0) {
            const item = queue.shift();
            if (item[0] == 'error')
                return item[1];
            this.push(item);
        }
        return null;
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
