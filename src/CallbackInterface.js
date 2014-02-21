var _                 = require( 'underscore' ),
    inherits          = require( 'util' ) .inherits,
    AsyncInterface    = require( './AsyncInterface' )


module.exports = CallbackInterface

/*
 * @class CallbackInterface
 * @extends AsyncInterfance
 * @author Jørn Andre Tangen @gorillatron
*/
function CallbackInterface( callback ) {
  AsyncInterface.apply( this, arguments )
}

inherits( CallbackInterface, AsyncInterface )

/*
 * Resolve the AsyncInterface by calling the callback with the passed data
 * @public
 * @function
 * @param {mixed} arguments
*/
CallbackInterface.prototype.resolve = function() {
  return this.callback.apply( this, [null].concat(Array.prototype.slice.call(arguments)) )
}

/*
 * Reject the AsyncInterface with an error
 * @public
 * @function
 * @param {object} error
*/
CallbackInterface.prototype.reject = function( error ) {
  return this.callback.call( this, error, null )
}

/*
 * Reject the AsyncInterface with an Error exception
 * @public
 * @function
 * @param {Error} exception
*/
CallbackInterface.prototype.throw = function( exception ) {
  return this.reject( exception )
}