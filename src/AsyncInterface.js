
module.exports = AsyncInterface

/*
 * @class AsyncInterface
 * @author Jørn Andre Tangen @gorillatron
*/
function AsyncInterface( callback ) {
  this.callback = callback
}

/*
 * Resolve the AsyncInterface by calling the callback with the passed data
 * @public
 * @function
 * @param {mixed} arguments
*/
AsyncInterface.prototype.resolve = function() {
  throw new Error( '#resolve not implemented' )
}

/*
 * Reject the AsyncInterface with an error
 * @public
 * @function
 * @param {object} error
*/
AsyncInterface.prototype.reject = function( exception ) {
  throw new Error( '#reject not implemented' )
}

/*
 * Reject the AsyncInterface with an Error exception
 * @public
 * @function
 * @param {Error} exception
*/
AsyncInterface.prototype.throw = function( exception ) {
  throw new Error( '#throw not implemented' )
}

/*
 * Get the interface implementation
 * @public
 * @function
 * @param {Error} exception
*/
AsyncInterface.prototype.getInterfaceImplementation = function() {
  return this
}


