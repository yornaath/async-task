var AsyncTask         = require( '../index' ).AsyncTask,
    PromiseInterface  = require( '../index' ).PromiseInterface

describe( 'AsyncTask', function() {

  describe('AsyncTask#execute', function() {

    it('should call the callback with the result of the doInBackground function', function( done ) {
      var asyncTask = new AsyncTask({
        doInBackground: function( a, b ) {
          return a + b
        }
      })

      asyncTask.execute(3,3, function( error, result ) {
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

      asyncTask.execute(null, function( error, result ) {
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

      asyncTask.execute(null, function( error, result ) {
        expect( result ).to.equal( 'imported' )
        done()
      })
    })

  })

  describe('AsyncTask#bind', function() {

    it('should bind the variables the task should be executed with', function( done ) {
      var asyncTask = new AsyncTask({
        doInBackground: function( a, b ) {
          return a + b
        }
      })

      asyncTask.bind(10, 12)

      asyncTask.execute(function( error, result ) {
        expect( result ).to.equal( 22 )
        done()
      })
    })

  })

  describe('PromiseInterface', function( done ) {

    var asyncTask, originalAsyncImplementation

    originalAsyncImplementation = AsyncTask.defaults.asyncInterfaceImplementation
    AsyncTask.defaults.asyncInterface = PromiseInterface

    after(function() {
      AsyncTask.defaults.asyncInterface = originalAsyncImplementation
    })

    beforeEach(function() {
      asyncTask = new AsyncTask({
        asyncInterfaceImplementation: PromiseInterface,
        doInBackground: function( a, b ) {
          return a + b
        }
      })
    })

    it('should', function( done ) {
      var promise = asyncTask.execute( 3, 4 )

      promise.then(function( result ){
        expect( result ).to.equal( 7 )
        done()
      })
    })

    it('should throw catchable errors', function( done ) {
      asyncTask.doInBackground = function(){
        return willThrowReferenceError
      }
      asyncTask.execute()
        .catch(function( error ) {
          expect (error ).to.be.a( ReferenceError )
          done()
        })
    })

    it('should work with callback too', function( done ) {
      asyncTask.execute( 4, 4, function( error, result ) {
        expect( result ).to.equal( 8 )
        done()
      })
    })

  })

  describe('AsyncTask#executeOnIFrame', function() {

    var asyncTask = null

    beforeEach(function() {
      asyncTask = new AsyncTask({
        doInBackground: function( a, b ) {
          return a + b
        }
      })
      asyncTask.hasWorkerSupport = function(){ return false }
    })

    it('should work without webworker and blob support', function( done ) {
      var executeOnIFrame = asyncTask.executeOnIFrame
      var executedOnIFrame = false
      asyncTask.executeOnIFrame = function(){
        executedOnIFrame = true
        return executeOnIFrame.apply( asyncTask, arguments )
      }

      asyncTask.execute( 3, 3, function( error, result ) {
        expect( result ).to.equal( 6 )
        expect( executedOnIFrame ).to.equal( true )
        done()
      })

    })

    it('should import scripts', function( done ) {
      window.importedFunc = null

      var asyncTask = new AsyncTask({
        importScripts: ["http://localhost:9876/base/test/import.js"],
        doInBackground: function() {
          return importedFunc()
        }
      })

      asyncTask.hasWorkerSupport = function(){ return false }

      asyncTask.execute(null, function( error, result ) {
        console.log(error ? error.message : "NO ERROR")
        expect( result ).to.equal( 'imported' )
        done()
      })
    })

  })

})
