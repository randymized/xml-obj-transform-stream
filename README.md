The purpose of this module is to convert XML into a either a stream or an asynchronous iterator of the nodes (events) encountered upon parsing the XML. The nodes that are output include start and end tags, text nodes, and other SAX parser events.

This module wraps around [Saxophone](https://www.npmjs.com/package/saxophone). Saxophone implements a readable stream and then emits events as XML nodes are parsed. This module implements a transform stream where input is sent to Saxophone for parsing and the resultant events are then pushed out as objects to the writable side of the stream. This module alternatively implements an asynchronous generator function that uses Saxophone to parse XML from an iterator, producing an iterable sequence of nodes. In either case a succession of nodes is output, where each node is represented by small tuple-like array containing the node type and associated data.

Please refer to the Saxophone documentation for more details about how it parses XML, its limits, and for benchmarks.

The transform stream expects XML to be piped into it from a readable stream. The asynchronous iterator expects input from an iterator, which could be a readable stream.

## Installation

This library works in Node.JS ≥10.
To install with `npm`:

```sh
$ npm install --save xml-obj-transform-stream
```
## Tests

To run tests, use the following commands:

```sh
$ git clone https://github.com/randymized/xml-obj-transform-stream.git
$ cd xml-obj-transform-stream
$ npm install
$ npm test
```

## Transform Stream Example

```js
const {XMLTransform}= require('xml-obj-transform-stream');
const {pipeline,Readable,Writable}= require('stream')

class ConsoleDirWritable extends Writable {
    constructor(options) {
        super(Object.assign({},options, {objectMode: true}))
    }
    _write(chunk,encoding,callback) {
        console.dir(chunk)
        callback()
    }
}

const options= {noEmptyText:true}
pipeline(
    Readable.from('<root><subpart>some text</subpart></root>'),
    new XMLTransform(options),
    new ConsoleDirWritable(),
    (err) => {
        if(err) {
            console.dir(err);
        }
    }
)
```

Output:

```sh
[ 'tagopen', 'root', '' ]
[ 'tagopen', 'subpart', '' ]
[ 'text', 'some text' ]
[ 'tagclose', 'subpart' ]
[ 'tagclose', 'root' ]
```

## Asynchronous Iterator Example

```js
const {xmlNodeGenerator}= require('xml-obj-transform-stream');
const {Readable}= require('stream')

async function consoledirWriter(iterator) {
    for await (tuple of iterator) {
        console.dir(tuple)
    }
}

const options= {noEmptyText:true}

consoledirWriter(
    xmlNodeGenerator(options,
        Readable.from('<root><subpart>some text</subpart></root>')
    )
).catch(console.error)
```

Output (same as from transform stream):

```sh
[ 'tagopen', 'root', '' ]
[ 'tagopen', 'subpart', '' ]
[ 'text', 'some text' ]
[ 'tagclose', 'subpart' ]
[ 'tagclose', 'root' ]
```

## Documentation

### Exports:

`const {XMLTransform,xmlNodeGenerator,parseAttrs,parseEntities,AvailableNodes,OpenTagAttributeParser}= require('xml-obj-transform-stream');`

- **XMLTransform** is a transform stream class. It is one of the two main alternative components of this module. The constructor is documented below.

- **xmlNodeGenerator** is an async generator function. It is one of the two main alternative components of this module. The function is documented below.

- **parseAttrs**
As a convenience, [Saxophone.parseAttrs](https://www.npmjs.com/package/saxophone#saxophoneparseattrsattrs) is exported by this package. It parses a string of XML attributes, such as would be output as a result of parsing an opening tag.

- **parseEntities**
As a convenience, [Saxophone.parseEntities](https://www.npmjs.com/package/saxophone#saxophoneparseentitiestext) is exported by this package. It expands all XML entities in a string to the characters represented by the entities.

- **OpenTagAttributeParser** is a simple transform stream that can follow the main XMLTransform stream in a pipeline. It will apply `parseAttrs` to any non-blank attribute strings in opening tags.

- **AvailableNodes** a list of all the types of nodes output
from this function in the form of an array of strings.  The types of nodes are: tagopen, tagclose, text, cdata, comment,and processinginstruction. See the include option below for one possible use.

### `new XMLTransform(options)`

Creates a new XML transform stream. The stream takes a stream of XML and outputs a stream of objects that represent each node encountered in the input XML.

#### (options):
- **include**
a list of node types to be output. See `AvailableNodes` above for a complete list. If option = `{include:['tagopen','tagclose']}`, for example, only opening and closing tags will be output. If `include` is not specified, all nodes will be output.
- **noEmptyText**
If truish, empty `text` nodes, or text that is all whitespace will not be output.
- **reportSelfClosing**
If truish, `tagopen` objects will include a fourth, true, element if the tag is self-closing (`<tag />`).
- **any additional options** will be passed through to the Tranform constructor.

### Output:

an `XMLTransform` object is a Transform stream with object mode output. It outputs objects representing each XML node encountered to whatever it is piped to. Each object is an array representing the node, where the first element of the array is the type of node and the other elements contain additional data about that node. The types of nodes and their output are:

- **tagopen**: `['tagopen', tag-name, attr-string, is-self-closing]`.
-- `attr-string` may be parsed with `parseAttrs` to convert it into a key/value object
-- `is-self-closing` is only present if the `reportSelfClosing` option is truish.
- **tagclose**: `['tagclose', tag-name]`
- **text**: `['text',content]`. Entities in the text may be parsed with the `parseEntities` function. If the `noEmptyText` option is truish, empty text and text consisting only of whitespace will not be output.
- **cdata**: `['cdata',content]`
- **commment**: `['comment',content]`
- **processinginstruction**: `['processinginstruction',content]`. Content of the processing instruction is not parsed.

### `xmlNodeGenerator(options,iterator)`
An async generator function that takes an iterator of XML as an argument and produces an asynchronously iterable succession of nodes.
- The options are the same as `XMLTransform`, except that any additional options will not be passed through to a Tranform constructor, since this is a function and not a subclass of Transform.
- The output is similar to that from `XMLTransform`, except that they are in the form of an asynchronous iterator over the nodes.

## Licence:
Released under the ISC license.