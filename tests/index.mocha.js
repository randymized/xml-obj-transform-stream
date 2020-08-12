'use strict';

const {pipeline, Readable, Writable}= require('stream')
const fs= require('fs')
const assert = require('assert');
const should = require('should');

const tags = require('common-tags');
const {XMLTransform,xmlNodeGenerator,parseAttrs,parseEntities,OpenTagAttributeParser}= require('../src/transform');
const { runInThisContext } = require('vm');
const wants= ['tagopen','text','tagclose',]

const sampleXML= tags.stripIndent`
<?xml version="1.0" encoding="UTF-8"?>
<head>
<!-- this is a comment -->
<title>XML Test File</title>
<selfclose />
<cdata-section><![CDATA[this is a c&data s<>ction]]></cdata-section>
<empty></empty>
<hasattrs first="one" second="two"  third="three " />
<textarea> this\nis\na\r\n\ttextual\ncontent  </textarea>
<other attr="value"></other>
</head>`

const selfClosingXML= tags.stripIndent`
    <outer>
    <selfclose />
    </outer>`

class ConsoleDirWritable extends Writable {
    constructor(options) {
        super(Object.assign({},options, {objectMode: true}))
    }
    _write(chunk,encoding,callback) {
        console.dir(chunk)
        callback()
    }
}

class ObjectArrayWritable extends Writable {
    constructor(options) {
        super(Object.assign({},options, {objectMode: true}))
        this.accum= []
    }
    _write(chunk,encoding,callback) {
        this.accum.push(chunk)
        callback()
    }
}

class ObjectArrayComparator extends Writable {
    constructor(compareTo, options) {
        super(Object.assign({},options, {objectMode: true}))
        this.compareTo= compareTo
        this.index= 0
    }
    _write(chunk,encoding,callback) {
        should.deepEqual(chunk,this.compareTo[this.index])
        this.index+= 1
        callback()
    }
}

async function asyncComparator(compareTo,source) {
    let index= 0
    for await (const received of source) {
        should.deepEqual(received,compareTo[index++])
    }
}

class ReadableString extends Readable {
    constructor(str) {
      super();
      this.str= str
      this.sent= false
    }

    _read() {
      if (!this.sent) {
        this.push(Buffer.from(this.str));
        this.sent = true
      }
      else {
        this.push(null)
      }
    }
  }

describe('XML Obj Transform Stream', function() {
    describe('Using a sample that contains several elements', function() {
        const compareTo= [
            [ 'processinginstruction', 'xml version="1.0" encoding="UTF-8"' ],
            [ 'text', '\n' ],
            [ 'tagopen', 'head', '' ],
            [ 'text', '\n' ],
            [ 'comment', ' this is a comment ' ],
            [ 'text', '\n' ],
            [ 'tagopen', 'title', '' ],
            [ 'text', 'XML Test File' ],
            [ 'tagclose', 'title' ],
            [ 'text', '\n' ],
            [ 'tagopen', 'selfclose', ' ' ],
            [ 'tagclose', 'selfclose' ],
            [ 'text', '\n' ],
            [ 'tagopen', 'cdata-section', '' ],
            [ 'cdata', 'this is a c&data s<>ction' ],
            [ 'tagclose', 'cdata-section' ],
            [ 'text', '\n' ],
            [ 'tagopen', 'empty', '' ],
            [ 'tagclose', 'empty' ],
            [ 'text', '\n' ],
            [ 'tagopen', 'hasattrs', ' first="one" second="two"  third="three " ' ],
            [ 'tagclose', 'hasattrs' ],
            [ 'text', '\n' ],
            [ 'tagopen', 'textarea', '' ],
            [ 'text', ' this\nis\na\r\n\ttextual\ncontent  ' ],
            [ 'tagclose', 'textarea' ],
            [ 'text', '\n' ],
            [ 'tagopen', 'other', ' attr="value"' ],
            [ 'tagclose', 'other' ],
            [ 'text', '\n' ],
            [ 'tagclose', 'head' ],
            [ 'text', '\n' ],
        ]
        it('should successfully parse with a transform stream', function(done) {
            const objectArrayComparator = new ObjectArrayComparator(compareTo);
            pipeline(
                new ReadableString(sampleXML),
                new XMLTransform(),
                objectArrayComparator,
                (err) => {
                    if(err) {
                        done(err);
                    }
                    else {
                        done()
                    }
                }
            )

        })
        it('should successfully parse using asynchronous iteration', function(done) {
            asyncComparator(compareTo,
                xmlNodeGenerator({},
                    new ReadableString(sampleXML)
                )
            )
            .then(done)
            .catch(done)
        })
    })

    // here goes your code
    describe('should allow choosing types of elements to report', function() {
        const toInclude = ['tagopen', 'tagclose'];
        const options = { include: toInclude };
        const compareTo= [
            [ 'tagopen', 'head', '' ],
            [ 'tagopen', 'title', '' ],
            [ 'tagclose', 'title' ],
            [ 'tagopen', 'selfclose', ' ' ],
            [ 'tagclose', 'selfclose' ],
            [ 'tagopen', 'cdata-section', '' ],
            [ 'tagclose', 'cdata-section' ],
            [ 'tagopen', 'empty', '' ],
            [ 'tagclose', 'empty' ],
            [ 'tagopen', 'hasattrs', ' first="one" second="two"  third="three " ' ],
            [ 'tagclose', 'hasattrs' ],
            [ 'tagopen', 'textarea', '' ],
            [ 'tagclose', 'textarea' ],
            [ 'tagopen', 'other', ' attr="value"' ],
            [ 'tagclose', 'other' ],
            [ 'tagclose', 'head' ]
        ]
        it('using a transform stream', function(done) {
            const objectArrayComparator = new ObjectArrayComparator(compareTo);
            pipeline(
                new ReadableString(sampleXML),
                new XMLTransform(options),
                objectArrayComparator,
                (err) => {
                    if(err) {
                        done(err);
                    }
                    else {
                        done()
                    }
                }
            )
        })
        it('using asynchronous iteration', function(done) {
            asyncComparator(compareTo,
                xmlNodeGenerator(options,
                    new ReadableString(sampleXML)
                )
            )
            .then(done)
            .catch(done)
        })
    });

    describe('Test omitting empty text', function () {
        const options= {noEmptyText:true}
        const sampleXMLParsed= [
            [ 'processinginstruction', 'xml version="1.0" encoding="UTF-8"' ],
            [ 'tagopen', 'head', '' ],
            [ 'comment', ' this is a comment ' ],
            [ 'tagopen', 'title', '' ],
            [ 'text', 'XML Test File' ],
            [ 'tagclose', 'title' ],
            [ 'tagopen', 'selfclose', ' ' ],
            [ 'tagclose', 'selfclose' ],
            [ 'tagopen', 'cdata-section', '' ],
            [ 'cdata', 'this is a c&data s<>ction' ],
            [ 'tagclose', 'cdata-section' ],
            [ 'tagopen', 'empty', '' ],
            [ 'tagclose', 'empty' ],
            [ 'tagopen', 'hasattrs', ' first="one" second="two"  third="three " ' ],
            [ 'tagclose', 'hasattrs' ],
            [ 'tagopen', 'textarea', '' ],
            [ 'text', ' this\nis\na\r\n\ttextual\ncontent  ' ],
            [ 'tagclose', 'textarea' ],
            [ 'tagopen', 'other', ' attr="value"' ],
            [ 'tagclose', 'other' ],
            [ 'tagclose', 'head' ],
        ]
        it('using a transform stream', function(done) {
            const objectArrayComparator = new ObjectArrayComparator(sampleXMLParsed);
            pipeline(
                new ReadableString(sampleXML),
                new XMLTransform(options),
                objectArrayComparator,
                (err) => {
                    if(err) {
                        done(err);
                    }
                    else {
                        done()
                    }
                }
            )

        });
        it('using asynchronous iteration', function(done) {
            asyncComparator(sampleXMLParsed,
                xmlNodeGenerator(options,
                    new ReadableString(sampleXML)
                )
            )
            .then(done)
            .catch(done)
        })
    })

    it('should allow reporting if a tag is self-closing', function(done) {
        const xml= selfClosingXML
        const options= {noEmptyText:true,reportSelfClosing:true}
        const expected= [
            [ 'tagopen', 'outer', '', false ],  // note the fourth element: self-closing?
            [ 'tagopen', 'selfclose', ' ', true ],
            [ 'tagclose', 'selfclose' ],
            [ 'tagclose', 'outer' ],
        ]
        const objectArrayComparator = new ObjectArrayComparator(expected);
        pipeline(
            new ReadableString(xml),
            new XMLTransform(options),
            objectArrayComparator,
            (err) => {
                if(err) {
                    done(err);
                }
                else {
                    done()
                }
            }
        )

    });

    it('should allow reporting if a tag is self-closing when tagclose is not reported', function(done) {
        const xml= selfClosingXML
        const options= {noEmptyText:true,reportSelfClosing:true,include:'tagopen'}
        const expected= [
            [ 'tagopen', 'outer', '', false ],
            [ 'tagopen', 'selfclose', ' ', true ],
        ]
        const objectArrayComparator = new ObjectArrayComparator(expected);
        pipeline(
            new ReadableString(xml),
            new XMLTransform(options),
            objectArrayComparator,
            (err) => {
                if(err) {
                    done(err);
                }
                else {
                    done()
                }
            }
        )

    });

    it('should ignore whether self-closing if not requested and tagclose not included', function(done) {
        const xml= selfClosingXML
        const options= {noEmptyText:true,include:'tagopen'}
        const expected= [
            [ 'tagopen', 'outer', '' ],  // note the fourth element: self-closing?
            [ 'tagopen', 'selfclose', ' ' ],
        ]
        const objectArrayComparator = new ObjectArrayComparator(expected);
        pipeline(
            new ReadableString(xml),
            new XMLTransform(options),
            objectArrayComparator,
            (err) => {
                if(err) {
                    done(err);
                }
                else {
                    done()
                }
            }
        )

    });

    it('should allow attributes to be parsed by exporting Saxophone.parseAttrs', function(done) {
        const xml= '<hasattrs first="one" second="two"  third="three " />'
        const options= {noEmptyText:true,include:'tagopen'}
        const expected= [ 'tagopen', 'hasattrs', {first:'one',second:"two",third:'three '} ]
        const objectArrayWritable = new ObjectArrayWritable(expected);
        pipeline(
            new ReadableString(xml),
            new XMLTransform(options),
            objectArrayWritable,
            (err) => {
                if(err) {
                    done(err);
                }
                else {
                    let tag= objectArrayWritable.accum.shift()
                    tag[2]= parseAttrs(tag[2])
                    should.deepEqual(tag,expected)
                    done()
                }
            }
        )

    });

    it('should provide an additional transform stream that reads objects emitted from the main tranform stream and parses attribute strings in open tags', function(done) {
        const xml= tags.stripIndent`
        <hasattrs first="one" second="two"  third="three " />
        <emptyattrs />
        `
        const options= {noEmptyText:true,include:'tagopen'}
        const expected= [
            [ 'tagopen', 'hasattrs', {first:'one',second:"two",third:'three '} ],
            [ 'tagopen', 'emptyattrs', {} ]
        ]
        pipeline(
            new ReadableString(xml),
            new XMLTransform(options),
            new OpenTagAttributeParser(),
            new ObjectArrayComparator(expected),
            (err) => {
                if(err) {
                    done(err);
                }
                else {
                    done()
                }
            }
        )

    });

    it('should allow access to the Saxophone.parseEntities function', function() {
        assert.equal(parseEntities('&quot;Run!&quot;, he said'), '"Run!", he said', 'normalize &quot;');
    })



});