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
  this.__boundArguments = []

  if( options.doInBackground )
    this.doInBackground = options.doInBackground
  if( options.asyncInterfaceImplementation )
    this.asyncInterfaceImplementation = options.asyncInterfaceImplementation || AsyncTask.defaults.asyncInterfaceImplementation
}


inherits( AsyncTask, EventEmitter )

/*
 * Default options for new AsyncTasks
 * @static
 * @public
 * @object
 * @property {object}           defaults                              - The default values for new AsyncTask's.
 * @property {AsyncInterface}   defaults.asyncInterfaceImplementation - The interface implementation to use for all new AsyncTasks
*/
AsyncTask.defaults = {
  asyncInterfaceImplementation: CallbackInterface
}

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
  var args, data, asyncInterface

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
  var args

  if( this.__hasExecuted ) {
    throw new Error( 'Cannot execute a allready executed AsyncTask' )
  }

  this.__hasExecuted = true

  this.emit( 'execute', arguments )

  if( this.__boundArguments ) {
    args = this.__boundArguments.concat( Array.prototype.slice.call( arguments ) )
  }
  else {
    args = Array.prototype.slice.call( arguments )
  }

  return BackgroundWorker.hasWorkerSupport() ? this.executeOnWorker.apply( this, args ) :
                                               this.executeOnMainthread.apply( this, args )
}

AsyncTask.prototype.bind = function() {
  this.__boundArguments = Array.prototype.slice.call( arguments )
}

AsyncTask.prototype.map = function( array ) {
  return _.map( array, _.bind(function( value ) {
    var task = new AsyncTask({
      doInBackground: this.doInBackground
    })
    task.bind( value )
    return task
  }, this))
}
