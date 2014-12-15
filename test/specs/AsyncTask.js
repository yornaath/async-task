var AsyncTask         = require( '../../index' )
var BackgroundWorker  = require( 'background-worker' )
var Promise           = require( 'bluebird' )
var expect            = require( 'expect.js' )
var isNode            = require( 'detect-node' )


describe( 'AsyncTask', function() {

  describe( 'AsyncTask#constructor', function(){

    it('should use first argument as doInBackground job if its a function', function( done ) {
      var asyncTask = new AsyncTask(function( a, b ) {
        return a + b
      })

      asyncTask.execute(3,3).then(function( result ) {
        expect( result ).to.equal( 6 )
        done()
      })
    })

    it('should use second argument as options job if the first is the task', function() {
      var opts = { keepAlive: true }

      var asyncTask = new AsyncTask(function( a, b ) {
        return a + b
      }, opts)

      expect( asyncTask._options ).to.equal( opts )
    })

  })

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

    it('should throw error if executed for the second time', function() {
      var asyncTask = new AsyncTask({
        doInBackground: function( a, b ) {
          return a + b
        }
      })

      var exception

      try {
        asyncTask.execute(3,3)
        asyncTask.execute(3,3)
      }
      catch( e ) {
        exception = e
      }

      expect( exception ).to.be.an( Error )
    })

    it('should be able to execute multipe times if option.keepAlive', function( done ) {
      var asyncTask = new AsyncTask({
        keepAlive: true,
        doInBackground: function( a, b ) {
          return a + b
        }
      })

      Promise.all([
        asyncTask.execute(1,1),
        asyncTask.execute(2,2),
        asyncTask.execute(3,3)
      ]).then(function(results) {
        expect(results).to.eql([2,4,6])
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

    if( !isNode ) {
      it('should import scripts', function( done ) {
        var asyncTask = new AsyncTask({
          importScripts: [location.protocol + "//" + location.host + "/base/test/assets/import.js"],
          doInBackground: function() {
            return importedFunc()
          }
        })

        asyncTask.execute(null).then(function( result ) {
          expect( result ).to.equal( 'imported' )
          done()
        })
      })
    }

  })

  describe('Sharing background-worker', function() {

    it('should work gdmit', function( done ) {
      var worker = new BackgroundWorker({})

      var taskA = new AsyncTask({
        worker: worker,
        doInBackground: function() {return "a" }
      })

      var taskB = new AsyncTask({
        worker: worker,
        doInBackground: function() {return "b" }
      })

      var taskC = new AsyncTask({
        worker: worker,
        doInBackground: function() {return "c" }
      })

      Promise.all([
        taskA.execute(),
        taskB.execute(),
        taskC.execute()
      ]).then(function(result) {
        expect( result ).to.eql([ 'a', 'b', 'c' ])
        worker.terminate()
        done()
      })

    })

  })

})
