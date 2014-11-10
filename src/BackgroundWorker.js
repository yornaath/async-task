var _                 = require( 'underscore' ),
    inherits          = require( 'util' ) .inherits,
    EventEmitter      = require( 'events' ).EventEmitter,
    PromiseInterface  = require( './PromiseInterface' )


module.exports = BackgroundWorker

/*
 * @class BackgroundWorker
 * @extends EventEmitter
 * @author Jørn Andre Tangen @gorillatron
*/
function BackgroundWorker( source ) {
  EventEmitter.apply( this, arguments )

  this.worker = null
  this.importScripts = []
  this.asyncInterfaces = {}
  this.definitions = []
  this.messageId = 0

}

inherits( BackgroundWorker, EventEmitter )

/*
 * Check WebWorker support
 * @static
 * @returns {boolean}
*/
BackgroundWorker.hasWorkerSupport = function() {
  return (typeof window.Worker !== 'undefined' && typeof window.Blob !== 'undefined') && (typeof window.URL.createObjectURL == 'function')
}

/*
 * The async interface this BackgroundWorker implementation supports
 * @public
 * @type {AsyncInterface}
*/
BackgroundWorker.prototype.asyncInterfaceImplementation = PromiseInterface

/*
 * Create a new AsyncInterface for this BackgroundWorker
 * @public
 * @function
 * @returns {AsyncInterface}
*/
BackgroundWorker.prototype.asyncInterfaceFactory = function( callback ) {
  return new this.asyncInterfaceImplementation( callback )
}

/*
 * Start the worker
 * @public
 * @function
*/
BackgroundWorker.prototype.start = function() {
  if( this.worker )
    throw new Error( 'cannot start allready started BackgroundWorker' )

  this.blob = new Blob([
    this.getWorkerSourcecode()
  ], { type: "text/javascript" })

  this.worker = new Worker( window.URL.createObjectURL(this.blob) )

  this.worker.onmessage = _.bind( this.workerOnMessageHandler, this )
  this.worker.onerror = _.bind( this.workerOnErrorHandler, this )

  return this
}

/*
 * Terminate the worker
 * @public
 * @function
*/
BackgroundWorker.prototype.terminate = function() {
  if( !this.worker )
    throw new Error('BackgroundWorker has no worker to terminate')
  return this.worker.terminate()
}

/*
 * Get a uniqie messageid to identify a worker message transaction
 * @public
 * @function
 * @returns {int}
*/
BackgroundWorker.prototype.getUniqueMessageId = function() {
  return this.messageId++
}

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
 * @param {function} calback
 * @returns {AsyncInterface}
*/
BackgroundWorker.prototype.run = function( command, args, callback ) {
  var messageId, message, asyncInterface

  messageId = this.getUniqueMessageId()
  message = { command: command, args: args, messageId: messageId }
  asyncInterface = this.asyncInterfaceFactory( callback )

  this.worker.postMessage( JSON.stringify(message) )
  this.asyncInterfaces[ messageId ] = asyncInterface

  return asyncInterface.getImplementation()
}

/*
 * Handle worker messages
 * @public
 * @function
 * @event
*/
BackgroundWorker.prototype.workerOnMessageHandler = function( event ) {
  var data, asyncInterface

  data = JSON.parse( event.data )


  asyncInterface = this.asyncInterfaces[ data.messageId ]

  if( data.exception )
    return asyncInterface.throw( this.createExceptionFromMessage( data.exception ) )

  asyncInterface.resolve( data.result )
}

/*
 * Create a exception by an obect describing it
 * @public
 * @function
 * @param {object} exception
 * @param {string} exception.type
 * @param {string} exception.message
 * @returns {Error}
*/
BackgroundWorker.prototype.createExceptionFromMessage = function( exception ) {
  var type, message

  try {
    type = typeof eval( exception.type ) == 'function' ? eval( exception.type ) : Error
  }
  catch( exception ) {
    type = Error
  }

  message = exception.message

  return new type( message )
}

/*
 * Handle worker error
 * @public
 * @function
 * @event
*/
BackgroundWorker.prototype.workerOnErrorHandler = function( event ) {
  var message, error, errorType, errorMessage

  event.preventDefault()

  message = event.message
  error = message.match(/Uncaught\s([a-zA-Z]+)\:(.*)/)

  try {
    errorType = typeof eval(error[1]) == 'function' ? eval(error[1]) : Error
    errorMessage = typeof eval(error[1]) == 'function' ? error[2] : message
  }
  catch( exception ) {
    errorType = Error
    errorMessage = message
  }

  error = new errorType( errorMessage )

  this.emit( 'exception', error )
}

/*
 * Get the sourcecode for this worker
 * @public
 * @function
 * @returns {string}
*/
BackgroundWorker.prototype.getWorkerSourcecode = function() {
  var src

  src = ""

  if( this.importScripts.length )
    src += "importScripts( '" + this.importScripts.join("','") + "' );\n"

  src += " var definitions = {};"

  _.forEach(this.definitions, function( definition ) {
    src += " definitions['" + definition.key + "'] = " + definition.val + ";"
  })

  src += "this.onmessage = function( event ) {  " +
           "var data = JSON.parse(event.data);" +
           "try {" +
              "var result = definitions[data.command].apply(this, data.args);" +
              "var out = { messageId: data.messageId, result: result };" +
              "this.postMessage( JSON.stringify(out) );" +
           "}" +
           "catch( exception ) {" +
             "var message = { messageId: data.messageId, exception: { type: exception.name, message: exception.message } };" +
             "this.postMessage(JSON.stringify(message));" +
           "}" +
         "};"

  return src
}
