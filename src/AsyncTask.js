var BackgroundWorker = require( 'background-worker' )
var uuid             = require( 'uuid' )

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
