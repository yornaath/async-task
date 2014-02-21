var AsyncTask         = require( '../index' ).AsyncTask,
    PromiseInterface  = require( '../index' ).PromiseInterface


describe( 'AsyncTask', function() {

  describe('AsyncTask#execute', function() {

    it('should call the callback with the result of the doInBackground function', function( done ) {
      var asyncTask = new AsyncTask()

      asyncTask.doInBackground = function(a,b) {
        return a + b
      }

      asyncTask.execute(3,3, function( error, result ) {
        expect( result ).to.equal( 6 )
        done()
      })

    })

    it('should work without webworker and blob support', function( done ) {
      var asyncTask = new AsyncTask()

      asyncTask.hasWorkerSupport = function(){ return false }

      asyncTask.doInBackground = function(a,b) {
        return a + b
      }

      asyncTask.execute( 3, 3, function( error, result ) {
        expect( result ).to.equal( 6 )
        done()
      })

    })

    it('should give error to callback on errors', function( done ) {
      var asyncTask = new AsyncTask()

      asyncTask.doInBackground = function() {
        throw new TypeError("LOOL")
      }

      asyncTask.execute(null, function( error, result ) {
        expect( error ).to.be.an( TypeError )
        done()
      })
    })

  })
  
  describe('PromiseInterface', function( done ) {

    it('should', function( done ) {
      var asyncTask = new AsyncTask

      asyncTask.asyncInterfaceImplementation = PromiseInterface

      asyncTask.doInBackground = function( a, b ) {
        return a + b  
      }

      promise = asyncTask.execute( 3, 4 )

      promise.then(function( result ){
        expect( result ).to.equal( 7 )
        done()
      })
    })

  })

})

