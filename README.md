A transform stream that takes a stream of XML as input and outputs a stream of objects representing the start and end tags, text nodes, and other SAX parser events.

This module wraps around [Saxophone](https://www.npmjs.com/package/saxophone). Saxophone implements a readable stream and then emits events as XML nodes are parsed. This module implements a transform stream where input is sent to Saxophone for parsing and the resultant events are then pushed out as objects to the writable side of the stream. Please refer to the Saxophone documentation for more details about how it parses XML, its limits and for benchmarks.

## Installation

This library works both in Node.JS ≥6.0 and recent browsers.
To install with `npm`:

```sh
$ npm install --save xml-obj-transform-stream
```
## Tests and coverage

To run tests and check coverage, use the following commands:

```sh
$ git clone https://github.com/randymized/xml-obj-transform-stream.git
$ cd xml-obj-transform-stream
$ npm install
$ npm test
```

