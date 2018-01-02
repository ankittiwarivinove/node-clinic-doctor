'use strict'

const test = require('tap').test
const endpoint = require('endpoint')
const startpoint = require('startpoint')
const SystemInfoDecoder = require('../format/system-info-decoder.js')
const TraceEventDecoder = require('../format/trace-event-decoder.js')

function traceEvent (data) {
  return Object.assign({ pid: 10, tid: 1, ph: 'X', cat: 'v8', args: {} }, data)
}

test('Format - trace event - combine', function (t) {
  const data = [
    traceEvent({ name: 'V8.GCScavenger', ts: 1400, dur: 500 }),
    traceEvent({ name: 'V8.GCIncrementalMarkingStart', ts: 2400, dur: 50 }),
    traceEvent({ name: 'V8.GCIncrementalMarking', ts: 3400, dur: 1000 }),
    traceEvent({ name: 'V8.GCIncrementalMarking', ts: 4400, dur: 1000 }),
    traceEvent({ name: 'V8.GCIncrementalMarkingFinalize', ts: 5400, dur: 50 }),
    traceEvent({ name: 'V8.GCIncrementalMarking', ts: 6400, dur: 1000 }),
    traceEvent({ name: 'V8.GCFinalizeMC', ts: 7400, dur: 1000 }),
    traceEvent({ name: 'V8.GCScavenger', ts: 8400, dur: 500 }),
    traceEvent({ name: 'V8.GCIncrementalMarking', ts: 9400, dur: 500 }),
    traceEvent({ name: 'V8.GCCompactor', ts: 10400, dur: 500 })
  ]

  const timeOffset = 33000000
  const systemInfoReader = new SystemInfoDecoder()
  systemInfoReader.end(JSON.stringify({
    clock: {
      hrtime: [0, 400000],
      unixtime: timeOffset
    }
  }))
  const decoder = new TraceEventDecoder(systemInfoReader)

  decoder.pipe(endpoint({ objectMode: true }, function (err, data) {
    if (err) return t.ifError(err)

    t.strictDeepEqual(data, [
      {
        pid: 10,
        tid: 1,
        ph: 'X',
        cat: 'v8',
        name: 'V8.GCScavenger',
        ts: 1400,
        dur: 500,
        args: {
          startTimestamp: 1 + timeOffset,
          endTimestamp: 1.5 + timeOffset
        }
      }, {
        pid: 10,
        tid: 1,
        ph: 'X',
        cat: 'v8',
        name: 'V8.GCMarkSweepCompact',
        ts: 2400,
        dur: 6000,
        args: {
          startTimestamp: 2 + timeOffset,
          endTimestamp: 8 + timeOffset
        }
      }, {
        pid: 10,
        tid: 1,
        ph: 'X',
        cat: 'v8',
        name: 'V8.GCScavenger',
        ts: 8400,
        dur: 500,
        args: {
          startTimestamp: 8 + timeOffset,
          endTimestamp: 8.5 + timeOffset
        }
      }, {
        pid: 10,
        tid: 1,
        ph: 'X',
        cat: 'v8',
        name: 'V8.GCIncrementalMarking',
        ts: 9400,
        dur: 500,
        args: {
          startTimestamp: 9 + timeOffset,
          endTimestamp: 9.5 + timeOffset
        }
      }, {
        pid: 10,
        tid: 1,
        ph: 'X',
        cat: 'v8',
        name: 'V8.GCCompactor',
        ts: 10400,
        dur: 500,
        args: {
          startTimestamp: 10 + timeOffset,
          endTimestamp: 10.5 + timeOffset
        }
      }
    ])
    t.end()
  }))

  decoder.end(JSON.stringify({
    traceEvents: data
  }))
})

test('Format - trace event - error', function (t) {
  const systemInfoReader = startpoint(
    new Error('expected error'),
    { objectMode: true }
  )
  const decoder = new TraceEventDecoder(systemInfoReader)

  decoder.pipe(endpoint({ objectMode: true }, function (err, data) {
    t.strictDeepEqual(err, new Error('expected error'))
    t.end()
  }))

  decoder.end(JSON.stringify({
    traceEvents: []
  }))
})