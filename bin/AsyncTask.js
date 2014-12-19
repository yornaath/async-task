!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.AsyncTask=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports = _dereq_( './src/AsyncTask' )

},{"./src/AsyncTask":8}],2:[function(_dereq_,module,exports){
module.exports = _dereq_('./src/BackgroundWorker')

},{"./src/BackgroundWorker":3}],3:[function(_dereq_,module,exports){
(function (__dirname){
"use strict";

var child_process     = _dereq_( 'child_process' ),
    isNode            = _dereq_( 'detect-node' )


module.exports = BackgroundWorker

/*
 * @class BackgroundWorker
 * @author Jørn Andre Tangen @gorillatron
*/
function BackgroundWorker( spec ) {

  spec = spec ? spec : {}

  this.importScripts = spec.importScripts || []
  this.definitions = spec.definitions || []
  this.domain =  spec.domain || !isNode ? (location.protocol + "//" + location.host) : null

  this._spec = spec
  this._worker = null
  this._iframe = null
  this._messageId = 0
  this._messagehandlers = {}
  this._state = BackgroundWorker.CREATED

  if( typeof spec === 'function' ) {
    this.define('default', spec )
  }
}

/*
 * Check WebWorker support
 * @static
 * @returns {boolean}
*/
BackgroundWorker.hasWorkerSupport = function() {
  return (typeof window.Worker !== 'undefined' && typeof window.Blob !== 'undefined') && (typeof window.URL.createObjectURL == 'function')
}

/*
* Check support for passing complex structures. Value is memoized
* @static
* @returns {boolean}
*/
BackgroundWorker.hasStructuredCloneSupport = memoize(function() {
  try {
    window.postMessage( document.createElement("a"),"*" )
    return true
  } catch( exception ) {
    return exception.DATA_CLONE_ERR ? false : true;
  }
})

/*
* State Created
* @static
*/
BackgroundWorker.CREATED = {}

/*
* State Running
* @static
*/
BackgroundWorker.RUNNING = {}

/*
* State Idle
* @static
*/
BackgroundWorker.IDLE = {}

/*
* State Terminated
* @static
*/
BackgroundWorker.TERMINATED = {}

/*
 * Define a command on the worker
 * @public
 * @function
*/
BackgroundWorker.prototype.define = function( key, val ) {
  this.definitions.push({ key: key, val: val })
}

/*
 * Run a given function defined in the BackgroundWorker
 * @public
 * @function
 * @param {string} command - command to run
 * @param {array} args - arguemnts to apply to command
 * @returns {Promise}
*/
BackgroundWorker.prototype.run = function( command, args ) {
  var self, messageId, message, handler, task, worker

  self = this

  if( typeof command !== 'string' ) {
    command = 'default'
    args = Array.prototype.slice.call( self )
  }

  if( self._state === BackgroundWorker.TERMINATED ) {
    throw new Error( 'Cannot call run on a Terminated BackgroundWorker' )
  }

  if( !self._isStarted ) {
    start( self )
  }

  stateChange( self, BackgroundWorker.RUNNING )

  messageId = getUniqueMessageId( self )
  message = { command: command, args: args, messageId: messageId }

  handler = {}

  task = new Promise(function(resolve, reject) {
    function setIdleThen(cb) {
      return function(){
        stateChange( self, BackgroundWorker.IDLE )
        cb.apply( self, arguments )
      }
    }
    handler.resolve = setIdleThen( resolve )
    handler.reject = setIdleThen( reject )
  })

  self._messagehandlers[ messageId ] = handler

  postMessage( self, message, self.domain )

  return task
}

/*
* Terminate the worker
* @public
* @function
*/
BackgroundWorker.prototype.terminate = function() {
  var self

  self = this

  if( isNode ) {
    if( self._childProcess ) self._childProcess.kill()
  }
  else if( BackgroundWorker.hasWorkerSupport() ) {
    if( self._worker )
      self._worker.terminate()
  }
  else if( self._iframe ){
    self._iframe.remove()
  }

  stateChange( self, BackgroundWorker.TERMINATED )
}

/*
* Start the worker. Should not be called by the user.
* @public
* @function
*/
BackgroundWorker.prototype._start = function() {
  return start( this )
}

/*
* Global reference
* @private
*/

var global = typeof global !== 'undefined' ? global :
             typeof window !== 'undefined' ? window : this

/*
* Start the worker
* @private
* @function
* @param {BackgroundWorker} self
*/
function start( self ) {
  if( self._isStarted ) {
    throw new Error( 'cannot start allready started BackgroundWorker' )
  }

  self._isStarted = true

  if( isNode ) {
    setupChildProcess( self )
  }
  else if( BackgroundWorker.hasWorkerSupport() ) {
    setupWebWorker( self )
  }
  else {
    setupIframe( self )
  }

  stateChange( self, BackgroundWorker.IDLE )

  return self
}

/*
* PostMessage to the underlying Worker implementation
* @private
* @function
*/
function postMessage( self, message, domain ) {
  if( isNode ) {
    self._childProcess.send( message )
  }
  else if( BackgroundWorker.hasWorkerSupport() ) {
    self._worker.postMessage( message )
  }
  else {
    self._iframe.contentWindow.postMessage( message, domain )
  }
}

/*
* Setup a Worker
* @private
* @function
* @param {BackgroundWorker} self
*/
function setupWebWorker( self ) {
  self.blob = new Blob([
    getWorkerSourcecode( self )
  ], { type: "text/javascript" })

  self._worker = new Worker( window.URL.createObjectURL(self.blob) )

  self._worker.onmessage = function( event ) {
    return workerOnMessageHandler( self, event )
  }
  self._worker.onerror = function( event )  {
    return workerOnErrorHandler( self, event )
  }
}

/*
* Setup a Process
* @private
* @function
* @param {BackgroundWorker} self
*/
function setupChildProcess( self ) {
  self._childProcess = child_process.fork( __dirname + '/nodeworker.js' )
  for( var i = 0; i < self.definitions.length; i++ ) {
    if( typeof self.definitions[i].val === 'function' ) {
      self.definitions[i].val = self.definitions[i].val.toString()
    }
    self._childProcess.send({ command: 'define', args: [self.definitions[i]], messageId: getUniqueMessageId(self) })
  }
  self._childProcess.on( 'message', function( message ) {
    childProcessOnMessageHandler( self, message )
  })
}


/*
* Setup a Iframe
* @private
* @function
*/
function setupIframe( self ) {
  var script, src

  self._iframe = document.createElement( 'iframe' )

  script = document.createElement( 'script' )

  if( !self._iframe.style ) self._iframe.style = {}
  self._iframe.style.display = 'none';

  src = ""

  src += "var domain = '" + self.domain + "';\n"
  src += "var importScripts = " + JSON.stringify(self.importScripts) + ";\n"
  src += "var definitions = {};\n"


  for( var i = 0; i < self.definitions.length; i++ ) {
    src += " definitions['" + self.definitions[i].key + "'] = " + self.definitions[i].val + ";\n"
  }

  src += ";(" + function(){

    function loadScripts( callback ) {
      var alloaded = false

      function next() {
        var src = importScripts.shift()
        if(alloaded || !src) {
          alloaded = true
          return callback()
        }
        var script = document.createElement('script')
        script.onload = function() {
          next()
        }
        document.body.appendChild( script )
        script.src = src
      }
      next()
    }


    self.onmessage = function( event ) {
      var data = event.data
      loadScripts(function() {
        try {
          var result = definitions[data.command].apply(this, data.args);
          var out = { messageId: data.messageId, result: result };
          postMessage( out, domain );
        }
        catch( exception ) {
          var message = { messageId: data.messageId, exception: { type: exception.name, message: exception.message } };
          postMessage( message, domain );
        }
      })
    }


  }.toString() + ")();\n"

  script.innerHTML = src

  window.document.body.appendChild( self._iframe )

  self._iframe.contentWindow.addEventListener( 'message', function( event ){ return iframeOnMessageHandler( self, event ) } )

  self._iframe.contentDocument.body.appendChild( script )

}

/*
* Get a uniqie messageid to identify a worker message transaction
* @private
* @function
* @returns {int}
*/
function getUniqueMessageId( self ) {
  return self._messageId++
}

/*
* Change state of BackgroundWorker and trigger event if it differs from old
* @private
* @function
*/
function stateChange( self, newstate ) {
  var oldstate

  oldstate = self._state
  self._state = newstate

  if( oldstate !== newstate ) {
    // self.emit( 'statechange:' + newstate )
    // self.emit( 'statechange', newstate )
    return true
  }

  return false
}

/*
 * Handle worker messages
 * @public
 * @function
 * @event
 * @param {BackgroundWorker} self
 * @param {Object} message
*/
function workerOnMessageHandler( self, event ) {
  var data, messagehandler

  data = event.data

  messagehandler = self._messagehandlers[ data.messageId ]

  if( data.exception ) {
    return messagehandler.reject( createExceptionFromMessage( self, data.exception ) )
  }

  messagehandler.resolve( data.result )
}

/*
* Handle worker messages
* @public
* @function
* @event
* @param {BackgroundWorker} self
* @param {Object} message
*/
function childProcessOnMessageHandler( self, message ) {
  var data, messagehandler

  data = message
  messagehandler = self._messagehandlers[ data.messageId ]

  if( data.exception ) {
    return messagehandler.reject( createExceptionFromMessage( self, data.exception ) )
  }

  messagehandler.resolve( data.result )
}

/*
 * Handle iframe messages
 * @public
 * @function
 * @event
 * @param {BackgroundWorker} self
 * @param {Object} message
*/
 function iframeOnMessageHandler( self, event ) {
  var data, messagehandler

  data = event.data

  if(data.command) return null

  messagehandler = self._messagehandlers[ data.messageId ]

  if( data.exception )
    return messagehandler.reject( createExceptionFromMessage( self, data.exception ) )

  messagehandler.resolve( data.result )

}


/*
 * Create a exception by an obect describing it
 * @private
 * @function
 * @param {object} exception
 * @param {string} exception.type
 * @param {string} exception.message
 * @returns {Error}
*/
function createExceptionFromMessage( self, exception ) {
  var type, message

  try {
    if( isNode ) {
      type = eval( exception.type )
    }
    else {
      type = typeof global[exception.type] == 'function' ? global[exception.type] : Error
    }
  }
  catch( exception ) {
    type = Error
  }

  message = exception.message

  return new type( message )
}

/*
* Memoize a function
* @private
* @function
*/
function memoize( fn ) {
  var _placeholder = {}
  var cache = _placeholder
  return function() {
    if( cache !== _placeholder ) {
      return cache
    }
    cache = fn.apply( null, arguments )
    return cache
  }
}

/*
 * Handle worker error
 * @private
 * @function
 * @event
*/
 function workerOnErrorHandler( self, event ) {
  var message, error, errorType, errorMessage

  event.preventDefault()

  message = event.message
  error = message.match(/Uncaught\s([a-zA-Z]+)\:(.*)/)

  try {
    errorType = typeof global[error[1]] == 'function' ? global[error[1]] : Error
    errorMessage = typeof global[error[1]] == 'function' ? error[2] : message
  }
  catch( exception ) {
    errorType = Error
    errorMessage = message
  }

  error = new errorType( errorMessage )

  self.emit( 'exception', error )
}

/*
 * Get the sourcecode for this worker
 * @private
 * @function
 * @returns {string}
*/
function getWorkerSourcecode( self ) {
  var src

  src = ""

  if( self.importScripts.length ) {
    src += "importScripts( '" + self.importScripts.join("','") + "' );\n"
  }

  src += " var definitions = {};"

  for( var i = 0; i < self.definitions.length; i++ ) {
    src += " definitions['" + self.definitions[i].key + "'] = " + self.definitions[i].val + ";\n"
  }

  src += "self.onmessage = function( event ) { " +
           "try {" +
              "var data = event.data;" +
              "var result = definitions[data.command].apply(this, data.args);" +
              "var out = { messageId: data.messageId, result: result };" +
              "this.postMessage( out );" +
           "}" +
           "catch( exception ) {" +
             "var message = { messageId: data.messageId, exception: { type: exception.name, message: exception.message } };" +
             "this.postMessage(message);" +
           "}" +
         "};"

  return src
}

}).call(this,"/node_modules/background-worker/src")
},{"child_process":5,"detect-node":4}],4:[function(_dereq_,module,exports){
(function (global){
module.exports = false;

// Only Node.JS has a process variable that is of [[Class]] process
try {
 module.exports = Object.prototype.toString.call(global.process) === '[object process]' 
} catch(e) {}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(_dereq_,module,exports){

},{}],6:[function(_dereq_,module,exports){
(function (global){

var rng;

if (global.crypto && crypto.getRandomValues) {
  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
  // Moderately fast, high quality
  var _rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(_rnds8);
    return _rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  _rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return _rnds;
  };
}

module.exports = rng;


}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(_dereq_,module,exports){
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var _rng = _dereq_('./rng');

// Maps for number <-> hex string conversion
var _byteToHex = [];
var _hexToByte = {};
for (var i = 0; i < 256; i++) {
  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
  _hexToByte[_byteToHex[i]] = i;
}

// **`parse()` - Parse a UUID into it's component bytes**
function parse(s, buf, offset) {
  var i = (buf && offset) || 0, ii = 0;

  buf = buf || [];
  s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
    if (ii < 16) { // Don't overflow!
      buf[i + ii++] = _hexToByte[oct];
    }
  });

  // Zero out remaining bytes if string was short
  while (ii < 16) {
    buf[i + ii++] = 0;
  }

  return buf;
}

// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
function unparse(buf, offset) {
  var i = offset || 0, bth = _byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = _rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; n++) {
    b[i + n] = node[n];
  }

  return buf ? buf : unparse(b);
}

// **`v4()` - Generate random UUID**

// See https://github.com/broofa/node-uuid for API details
function v4(options, buf, offset) {
  // Deprecated - 'format' argument, as supported in v1.2
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || _rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ii++) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || unparse(rnds);
}

// Export public API
var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;
uuid.parse = parse;
uuid.unparse = unparse;

module.exports = uuid;

},{"./rng":6}],8:[function(_dereq_,module,exports){
var BackgroundWorker = _dereq_( 'background-worker' )
var uuid             = _dereq_( 'uuid' )

module.exports = AsyncTask

/*
 * @class AsyncTask
 * @author Jørn Andre Tangen @gorillatron
*/
function AsyncTask( doInBackground, options ) {
  if( typeof doInBackground === 'object' ) {
    options = doInBackground
    doInBackground = options.doInBackground
  }

  this._options = typeof options === 'object' ? options : {}

  this.__uuid = uuid.v4()

  this.__hasExecuted = false
  this.__keepAlive = this._options.keepAlive
  this.__sharingworker = false

  this.doInBackground = doInBackground
  this.importScripts = this._options.importScripts ? this._options.importScripts : []

  if( typeof this.doInBackground !== 'function' ) {
    console.warn( 'AsyncTask[' + this.__uuid  + '].doInBackground is not function', this )
  }

  if( this._options.worker ) {
    this.__sharingworker = true
    this.setWorker( this._options.worker )
  }
}

/*
 * Setup a background-worker/BackgroundWorker
 * @public
 * @function
*/
AsyncTask.prototype.setWorker = function( worker ) {
  this._worker = worker
  this._worker.importScripts = this.importScripts
  this._worker.define( this.__uuid + '::doInBackground', this.doInBackground.toString() )
  return this._worker
}

/*
* Array slice
* @private
* @function
* @returns Array
*/
var slice = Array.prototype.slice

/*
 * Execute the background job on a worker
 * @public
 * @function
 * @returns {bluebird/Promise}
*/
AsyncTask.prototype.execute = function() {
  var worker, args, taskPromise

  if( this.__hasExecuted && !this.__keepAlive ) {
    throw new Error( 'Cannot execute a allready executed AsyncTask' )
  }

  if( !this._worker ) {
    this.setWorker( new BackgroundWorker({}) )
  }

  this.__hasExecuted = true

  worker = this._worker
  args = slice.call( arguments )
  taskPromise = worker.run( this.__uuid + '::doInBackground', args )

  if( !this.__keepAlive && !this.__sharingworker ) {
    taskPromise
      .then(function() { worker.terminate() })
      .catch(function() { worker.terminate() })
  }

  return taskPromise
}

},{"background-worker":2,"uuid":7}]},{},[1])
(1)
});