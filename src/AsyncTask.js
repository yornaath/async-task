var _                 = require( 'underscore' ),
    inherits          = require( 'util' ) .inherits,
    EventEmitter      = require( 'events' ).EventEmitter,
    CallbackInterface = require( './CallbackInterface' )


module.exports = AsyncTask

/*
 * @class DateFilter
 * @extends EventEmitter
 * @author Jørn Andre Tangen @gorillatron
*/
function AsyncTask( options ) {
  EventEmitter.apply( this, arguments )

  options = typeof options != 'undefined' ? options : {}
  this.__hasExecuted = false

  if( options.doInBackground )
    this.doInBackground = options.doInBackground
  if( options.asyncInterfaceImplementation )
    this.asyncInterfaceImplementation = options.asyncInterfaceImplementation
}


inherits( AsyncTask, EventEmitter )


/*
 * Identity object for unset values
 * @public
 * @function
*/
AsyncTask.prototype.setupWorker = function() {
  if(this.worker)
    return null

  this.blob = new Blob([
    this.getWorkerSourcecode()
  ], { type: "text/javascript" })

  this.worker = new Worker( window.URL.createObjectURL(this.blob) )

  this.worker.onmessage = _.bind( this.workerOnMessageHandler, this )
  this.worker.onerror = _.bind( this.workerOnErrorHandler, this )
}

/*
 * Handle worker messages
 * @public
 * @function
 * @event
*/
AsyncTask.prototype.workerOnMessageHandler = function( event ) {
  var data

  data = JSON.parse( event.data )
  
  this.emit( 'done', data.result, event )
}

/*
 * Handle worker error
 * @public
 * @function
 * @event
*/
AsyncTask.prototype.workerOnErrorHandler = function( event ) {
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
 * Get the source code for the background worker
 * @public
 * @function
 * @returns {string}
*/
AsyncTask.prototype.getWorkerSourcecode = function() {
  return ';(function(){ ' +
    'var doInBackground = ' + this.doInBackground.toString() + ';' +
      'this.onmessage = function( event ) { ' +
        'var data = JSON.parse(event.data); ' +
        'var args = data.args; ' +
        'var out = {}; ' +
        'out.result = doInBackground.apply(this, args); ' +
        'out.payLoadId = data.payLoadId; ' +
        'this.postMessage( JSON.stringify(out) ); ' +
      '}; ' +
    '}).call( this );';
}

/*
 * The async interface this AsyncTask implementation supports
 * @public
 * @class
*/
AsyncTask.prototype.asyncInterfaceImplementation = CallbackInterface

/*
 * Create a new AsyncInterface for this AsyncTask
 * @public
 * @function
 * @returns {AsyncInterface}
*/
AsyncTask.prototype.asyncInterfaceFactory = function( callback ) {
  return new this.asyncInterfaceImplementation( callback )
}

/*
 * Check if there is support for web workers and blobs
 * @public
 * @function
 * @returns {boolean}
*/
AsyncTask.prototype.hasWorkerSupport = function() {
  return typeof window.Worker !== 'undefined' && typeof window.Blob !== 'undefined'
}

/*
 * Execute the background job on a worker
 * @public
 * @function
*/
AsyncTask.prototype.executeOnWorker = function() {
  var args, data, asyncInterface

  this.setupWorker()

  args = Array.prototype.slice.call( arguments, 0, arguments.length - 1 )
  callback = arguments[ arguments.length - 1 ]

  if( typeof callback != 'function' ){
    args =   Array.prototype.slice.call( arguments)
    callback = null
  }

  data = {}

  data.args = args
  
  asyncInterface = this.asyncInterfaceFactory( callback )

  this.once( 'done', _.bind(function( result ) {
    asyncInterface.resolve( result )
  }, this))

  this.once( 'error', _.bind(function( error ) {
    asyncInterface.reject( error )
  }, this))

  this.once( 'exception', _.bind(function( error ) {
    asyncInterface.throw( error )
  }, this))

  try {
    data = JSON.stringify( data )
  }
  catch( JSONException ) {
    asyncInterface.throw( JSONException )
  }

  this.worker.postMessage( data )

  return asyncInterface.getInterfaceImplementation()
}

/*
 * Execute the background job on the main thread.
 * @public
 * @function
*/
AsyncTask.prototype.executeOnMainthread = function() {
  var args, data

  args = Array.prototype.slice.call( arguments, 0, arguments.length - 1 )
  callback = arguments[ arguments.length - 1 ]

  if( typeof callback != 'function' ){
    args =   Array.prototype.slice.call( arguments)
    callback = null
  }
  
  asyncInterface = this.asyncInterfaceFactory( callback )

  try {
    data = this.doInBackground.apply({}, args)
  }
  catch( exception ) {
    asyncInterface.throw( exception )
  }

  setTimeout( _.bind(function(){
    asyncInterface.resolve( data )
  }, this), 0)

  return asyncInterface.getInterfaceImplementation()
}

/*
 * Execute the task
 * @public
 * @function
*/
AsyncTask.prototype.execute = function( callback ) {
  if( this.__hasExecuted ) {
    throw new Error( 'Cannot execute a allready executed AsyncTask' )
  }

  this.__hasExecuted = true

  this.emit( 'execute', arguments )

  return this.hasWorkerSupport() ? this.executeOnWorker.apply( this, arguments ) :
                                   this.executeOnMainthread.apply( this, arguments )
}


