var _                 = require( 'underscore' ),
    inherits          = require( 'util' ) .inherits,
    AsyncInterface    = require( './AsyncInterface' ),
    Promise           = require( 'bluebird' )

module.exports = PromiseInterface

/*
 * @class CallbackInterface
 * @extends AsyncInterfance
 * @author Jørn Andre Tangen @gorillatron
*/
function PromiseInterface( callback ) {
  AsyncInterface.apply( this, arguments )

  this.callback = typeof callback == 'function' ? callback : function(){}

  this.promise = new Promise(_.bind(function( resolve, reject ) {
    this.__resolve = resolve
    this.__reject = reject
  }, this))
}

inherits( PromiseInterface, AsyncInterface )

/*
 * Resolve the AsyncInterface by calling the callback with the passed data
 * @public
 * @function
 * @param {mixed} arguments
*/
PromiseInterface.prototype.resolve = function() {
  this.callback.apply( {}, [null].concat(Array.prototype.slice.call(arguments)) )
  return this.__resolve.apply( this.promise, Array.prototype.slice.call(arguments) )
}

/*
 * Reject the AsyncInterface with an error
 * @public
 * @function
 * @param {object} error
*/
PromiseInterface.prototype.reject = function( error ) {
  this.callback.apply( {}, [error] )
  return this.__reject( error )
}

/*
 * Reject the AsyncInterface with an Error exception
 * @public
 * @function
 * @param {Error} exception
*/
PromiseInterface.prototype.throw = function( exception ) {
  return this.reject( exception )
}

/*
 * Get the interface implementation
 * @public
 * @function
 * @param {Error} exception
*/
AsyncInterface.prototype.getImplementation = function() {
  return this.promise
}