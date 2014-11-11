var AsyncTask         = require( '../index' ).AsyncTask

describe( 'AsyncTask', function() {

  describe('AsyncTask#execute', function() {

    it('should call the callback with the result of the doInBackground function', function( done ) {
      var asyncTask = new AsyncTask({
        doInBackground: function( a, b ) {
          return a + b
        }
      })

      asyncTask.execute(3,3).then(function( result ) {
        expect( result ).to.equal( 6 )
        done()
      })

    })

    it('should give error to callback on errors', function( done ) {
      var asyncTask = new AsyncTask({
        doInBackground: function() {
          throw new TypeError("LOOL")
        }
      })

      asyncTask.execute(null).catch(function( error ) {
        expect( error ).to.be.an( TypeError )
        done()
      })
    })

    it('should import scripts', function( done ) {
      var asyncTask = new AsyncTask({
        importScripts: ["http://localhost:9876/base/test/import.js"],
        doInBackground: function() {
          return importedFunc()
        }
      })

      asyncTask.execute(null).then(function( result ) {
        expect( result ).to.equal( 'imported' )
        done()
      })
    })

  })


})
