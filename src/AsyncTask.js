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

  this.doInBackground = options.doInBackground ? options.doInBackground : null
  this.importScripts = options.importScripts ? options.importScripts : []
  if( options.asyncInterfaceImplementation )
    this.asyncInterfaceImplementation = options.asyncInterface || AsyncTask.defaults.asyncInterface

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
  asyncInterface: CallbackInterface
}

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
  var args, callback, data, asyncInterface

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
AsyncTask.prototype.executeOnIFrame = function() {
  var args, callback, asyncInterface, iframe, script, code

  args = Array.prototype.slice.call( arguments, 0, arguments.length - 1 )
  callback = arguments[ arguments.length - 1 ]

  if( typeof callback != 'function' ){
    args =   Array.prototype.slice.call( arguments )
    callback = null
  }

  asyncInterface = this.asyncInterfaceFactory( callback )

  iframe = document.createElement( 'iframe' )
  script = document.createElement( 'script' )

  code = ""

  code += "var domain = '" + location.protocol + "//" + location.host + "';"
  code += "var importScripts = " + JSON.stringify(this.importScripts) + ";"
  code += "var args = " + JSON.stringify(args) + ";"
  code += "var doInBackground = " + this.doInBackground.toString() + ";"

  code += ";(" + function(){

    var _doInBackground = function(){
      try {
        var res = doInBackground.apply({}, args)
        postMessage({ event: 'result', data: res }, domain)
      }
      catch (exception) {
        postMessage({ event: 'exception', data: exception.message }, domain)
      }
    }

    if( importScripts.length > 0 ) {
      var loaded = 0
      for (var i = 0; i < importScripts.length; i++) {
        var script = document.createElement('script')
        script.onload = function() {
          loaded += 1
          if( loaded === importScripts.length )
            _doInBackground()
        }
        document.body.appendChild( script )
        script.src = importScripts[i]
      }
    }
    else {
      _doInBackground()
    }

  }.toString() + ").call(window);"

  script.innerHTML = code

  window.document.body.appendChild( iframe )

  iframe.contentWindow.addEventListener('message', function( message ) {
    if( message.data.event === 'exception') {
      asyncInterface.throw( new Error(message.data.data) )
    }
    else {
      asyncInterface.resolve( message.data.data )
    }
  })

  iframe.contentDocument.body.appendChild( script )

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

  return this.hasWorkerSupport() ? this.executeOnWorker.apply( this, args ) :
                                   this.executeOnIFrame.apply( this, args )
}

AsyncTask.prototype.hasWorkerSupport = function(){
  return BackgroundWorker.hasWorkerSupport()
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
