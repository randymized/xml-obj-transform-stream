const Saxophone = require('saxophone');
exports.Saxophone= Saxophone
exports.parseAttrs= Saxophone.parseAttrs
exports.parseEntities= Saxophone.parseEntities

exports.OpenTagAttributeParser= require("./OpenTagAttributeParser").OpenTagAttributeParser
exports.openTagAttributeAsyncMap= require("./openTagAttributeAsyncMap").openTagAttributeAsyncMap
exports.xmlNodeGenerator= require("./generator").xmlNodeGenerator
exports.AvailableNodes= require("./setUpParserQueue").AvailableNodes
exports.XMLTransform= require("./XMLTransform").XMLTransform
