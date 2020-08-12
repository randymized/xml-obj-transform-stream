const Queue = require('tiny-queue');

const AvailableNodes= [
    'tagopen',
    'tagclose',
    'text',
    'cdata',
    'comment',
    'processinginstruction',
]
exports.AvailableNodes= AvailableNodes

/**
 * Set listeners for parser events. If options.include is set, listeners are set
 * only for the selected event. Each parser event is queued in the form of an array
 * where the first element is the type of the event with additional elements as
 * needed for tag name, attributes, text or other content.
 *
 *
 * @param {object} options
 * @param {Saxophone} parser an instance of the Saxophone parser
 * @return an iterator over an internal queue. Each time the iterator is invoked the current contents
 * of the queue are yielded and the queue is emptied. The queue itself is not exposed.
 */
function setUpParserQueue(options, parser) {
    const queue = new Queue();

    let optinclude = options.include || AvailableNodes;
    if (!Array.isArray(optinclude))
        optinclude = [optinclude];
    const wantsTagclose= optinclude.includes('tagclose')
    const optNoEmptyText = options.noEmptyText;
    const optReportSelfClosing = options.reportSelfClosing;

    optinclude.forEach(include => {
        switch (include) {
            case 'tagopen':
                if (wantsTagclose) {
                    if (optReportSelfClosing) {
                        parser.on(include, obj => {
                            queue.push([include, obj.name, obj.attrs, obj.isSelfClosing]);
                            if (obj.isSelfClosing) {
                                queue.push(['tagclose', obj.name]);
                            }
                        });
                    }
                    else {
                        parser.on(include, obj => {
                            queue.push([include, obj.name, obj.attrs]);
                            if (obj.isSelfClosing) {
                                queue.push(['tagclose', obj.name]);
                            }
                        });
                    }
                }
                else {
                    if (optReportSelfClosing) {
                        parser.on(include, obj => {
                            queue.push([include, obj.name, obj.attrs, obj.isSelfClosing]);
                        });
                    }
                    else {
                        parser.on(include, obj => {
                            queue.push([include, obj.name, obj.attrs]);
                        });
                    }
                }
                break;
            case 'tagclose':
                parser.on(include, obj => {
                    queue.push([include, obj.name]);
                });
                break;
            case 'text':
                if (optNoEmptyText) {
                    parser.on(include, obj => {
                        if (!/^\s*$/.test(obj.contents)) {
                            queue.push([include, obj.contents]);
                        }
                    });
                }
                else {
                    parser.on(include, obj => {
                        queue.push([include, obj.contents]);
                    });
                }
                break;
            case 'cdata':
            case 'comment':
            case 'processinginstruction':
                parser.on(include, obj => queue.push([include, obj.contents]));
                break;
        }
    });

    return function* iterateQueue() {
        while (queue.length > 0) {
            yield queue.shift();
        }
    };
}
exports.setUpParserQueue = setUpParserQueue;
