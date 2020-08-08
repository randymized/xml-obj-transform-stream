'use strict';

const {pipeline, Readable, Writable}= require('stream')
const fs= require('fs')
const assert = require('assert');
const should = require('should');

const tags = require('common-tags');
const {XMLTransform}= require('../src/transform');
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
        this.accum= []
        this.compareTo= compareTo
        this.index= 0
    }
    _write(chunk,encoding,callback) {
        debugger
        should.deepEqual(chunk,this.compareTo[this.index])
        this.index+= 1
        callback()
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
    it('should parse a sample that contains several elements', function(done) {
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

    });

    // here goes your code
    it('should allow choosing types of elements to report', function(done) {
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

    });

    it('should allow omitting empty text', function(done) {
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

});