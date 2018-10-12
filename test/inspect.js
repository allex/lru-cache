// vim: set nowrap:
var util = require('util')
var t = require('tap')
var LRU = require('../')

// get LRU default naiveLength
const naiveLength = (new LRU()).lengthCalculator

function isStale (self, hit) {
  if (!hit || (!hit.maxAge && !self.maxAge)) {
    return false
  }
  var stale = false
  var diff = Date.now() - hit.now
  if (hit.maxAge) {
    stale = diff > hit.maxAge
  } else {
    stale = self.maxAge && (diff > self.maxAge)
  }
  return stale
}

LRU.prototype.inspect = function (n, opts) {
  var str = 'LRUCache {'
  var extras = false

  var as = this.allowStale
  if (as) {
    str += '\n  allowStale: true'
    extras = true
  }

  var max = this.max
  if (max && max !== Infinity) {
    if (extras) {
      str += ','
    }
    str += '\n  max: ' + util.inspect(max, opts)
    extras = true
  }

  var maxAge = this.maxAge
  if (maxAge) {
    if (extras) {
      str += ','
    }
    str += '\n  maxAge: ' + util.inspect(maxAge, opts)
    extras = true
  }

  var lc = this.lengthCalculator
  if (lc && lc !== naiveLength) {
    if (extras) {
      str += ','
    }
    str += '\n  size: ' + util.inspect(this.size, opts)
    str += ',\n  length: ' + util.inspect(this.length, opts)
    extras = true
  }

  var didFirst = false
  this.dumpLru().forEach(function (item) {
    if (didFirst) {
      str += ',\n  '
    } else {
      if (extras) {
        str += ',\n'
      }
      didFirst = true
      str += '\n  '
    }
    var key = util.inspect(item.key).split('\n').join('\n  ')
    var val = { value: item.value }
    if (item.maxAge !== maxAge) {
      val.maxAge = item.maxAge
    }
    if (lc !== naiveLength) {
      val.length = item.length
    }
    if (isStale(this, item)) {
      val.stale = true
    }

    val = util.inspect(val, opts).split('\n').join('\n  ')
    str += key + ' => ' + val
  })

  if (didFirst || extras) {
    str += '\n'
  }
  str += '}'

  return str
}

var l = LRU()

function inspect (str) {
  t.equal(util.inspect(l), str)
  t.equal(l.inspect(), str)
}

inspect('LRUCache {}')

l.max = 10
inspect('LRUCache {\n  max: 10\n}')

l.maxAge = 50
inspect('LRUCache {\n  max: 10,\n  maxAge: 50\n}')

l.set({ foo: 'bar' }, 'baz')
inspect("LRUCache {\n  max: 10,\n  maxAge: 50,\n\n  { foo: 'bar' } => { value: 'baz' }\n}")

l.maxAge = 0
l.set(1, {a: {b: {c: {d: {e: {f: {}}}}}}})
inspect("LRUCache {\n  max: 10,\n\n  1 => { value: { a: { b: [Object] } } },\n  { foo: 'bar' } => { value: 'baz', maxAge: 50 }\n}")

l.allowStale = true
inspect("LRUCache {\n  allowStale: true,\n  max: 10,\n\n  1 => { value: { a: { b: [Object] } } },\n  { foo: 'bar' } => { value: 'baz', maxAge: 50 }\n}")

setTimeout(function () {
  inspect("LRUCache {\n  allowStale: true,\n  max: 10,\n\n  1 => { value: { a: { b: [Object] } } },\n  { foo: 'bar' } => { value: 'baz', maxAge: 50, stale: true }\n}")

  // prune stale items
  l.forEach(function () {})
  inspect('LRUCache {\n  allowStale: true,\n  max: 10,\n\n  1 => { value: { a: { b: [Object] } } }\n}')

  l.lengthCalculator = function () { return 5 }
  inspect('LRUCache {\n  allowStale: true,\n  max: 10,\n  size: 5,\n  length: 5,\n\n  1 => { value: { a: { b: [Object] } }, length: 5 }\n}')

  l.max = 0
  inspect('LRUCache {\n  allowStale: true,\n  size: 5,\n  length: 5,\n\n  1 => { value: { a: { b: [Object] } }, length: 5 }\n}')

  l.maxAge = 100
  inspect('LRUCache {\n  allowStale: true,\n  maxAge: 100,\n  size: 5,\n  length: 5,\n\n  1 => { value: { a: { b: [Object] } }, maxAge: 0, length: 5 }\n}')
  l.allowStale = false
  inspect('LRUCache {\n  maxAge: 100,\n  size: 5,\n  length: 5,\n\n  1 => { value: { a: { b: [Object] } }, maxAge: 0, length: 5 }\n}')

  l.maxAge = 0
  inspect('LRUCache {\n  size: 5,\n  length: 5,\n\n  1 => { value: { a: { b: [Object] } }, length: 5 }\n}')

  l.lengthCalculator = null
  inspect('LRUCache {\n  1 => { value: { a: { b: [Object] } } }\n}')
}, 100)
