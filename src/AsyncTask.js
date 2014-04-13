var _                 = require( 'underscore' ),
    inherits          = require( 'util' ) .inherits,
    EventEmitter      = require( 'events' ).EventEmitter,
    CallbackInterface = require( './CallbackInterface' ),
    BackgroundWorker  = require( './BackgroundWorker' )


module.exports = AsyncTask

/*
 * @class AsyncTask
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
  if( !this.worker ) {
    this.worker = new BackgroundWorker()
    this.worker.define( 'doInBackground', this.doInBackground.toString() )
    this.worker.start()
  }
  return this.worker
}

/*
 * The async interface this AsyncTask implementation supports
 * @public
 * @type {AsyncInterface}
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
 * Execute the background job on a worker
 * @public
 * @function
 * @returns {AsyncInterface}
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

  try {
    data = JSON.stringify( data )
  }
  catch( JSONException ) {
    asyncInterface.throw( JSONException )
  }

  this.worker.run( 'doInBackground', args )
    .then( _.bind(asyncInterface.resolve, asyncInterface) )
    .catch( _.bind(asyncInterface.throw, asyncInterface) )
    .finally( _.bind(this.worker.terminate, this.worker) )

  return asyncInterface.getImplementation()
}

/*
 * Execute the background job on the main thread.
 * @public
 * @function
 * @returns {AsyncInterface}
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

  return asyncInterface.getImplementation()
}

/*
 * Execute the task
 * @public
 * @function
 * @returns {AsyncInterface}
*/
AsyncTask.prototype.execute = function( callback ) {
  if( this.__hasExecuted ) {
    throw new Error( 'Cannot execute a allready executed AsyncTask' )
  }

  this.__hasExecuted = true

  this.emit( 'execute', arguments )

  return BackgroundWorker.hasWorkerSupport() ? this.executeOnWorker.apply( this, arguments ) :
                                               this.executeOnMainthread.apply( this, arguments )
}
