var _                 = require( 'underscore' ),
    inherits          = require( 'util' ) .inherits,
    EventEmitter      = require( 'events' ).EventEmitter,
    BackgroundWorker  = require( 'background-worker' )


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
  this.__keepAlive = options.keepAlive
  this.__boundArguments = []

  this.doInBackground = options.doInBackground ? options.doInBackground : null
  this.importScripts = options.importScripts ? options.importScripts : []

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
AsyncTask.defaults = {}

/*
 * Identity object for unset values
 * @public
 * @function
*/
AsyncTask.prototype.setupWorker = function() {
  if( !this.worker ) {
    this.worker = new BackgroundWorker({})
    this.worker.importScripts = this.importScripts
    this.worker.define( 'doInBackground', this.doInBackground.toString() )
    this.worker.start()
  }
  return this.worker
}

/*
 * Execute the background job on a worker
 * @public
 * @function
 * @returns {bluebird/Promise}
*/
AsyncTask.prototype.execute = function() {
  var args, taskPromise

  if( this.__hasExecuted && !this.__keepAlive ) {
    throw new Error( 'Cannot execute a allready executed AsyncTask' )
  }

  this.__hasExecuted = true

  this.emit( 'execute' )

  this.setupWorker()

  args = Array.prototype.slice.call( arguments )

  taskPromise = this.worker.run( 'doInBackground', args )

  if( !this.__keepAlive )
    taskPromise.finally( _.bind(this.worker.terminate, this.worker) )

  return taskPromise
}
