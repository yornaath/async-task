var _                 = require( 'underscore' ),
    inherits          = require( 'util' ) .inherits,
    AsyncInterface    = require( './AsyncInterface' )


module.exports = PromiseInterface

/*
 * @class CallbackInterface
 * @extends AsyncInterfance
 * @author Jørn Andre Tangen @gorillatron
*/
function PromiseInterface( callback ) {
  AsyncInterface.apply( this, arguments )
  this.promise = new Promise(_.bind(function( resolve, reject ) {
    this.resolvePromise = resolve
    this.rejectPromise = reject
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
  return this.resolvePromise.apply( this.promise, Array.prototype.slice.call(arguments) )
}

/*
 * Reject the AsyncInterface with an error
 * @public
 * @function
 * @param {object} error
*/
PromiseInterface.prototype.reject = function( error ) {
  return this.rejectPromise( error )
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
AsyncInterface.prototype.getInterfaceImplementation = function() {
  return this.promise
}