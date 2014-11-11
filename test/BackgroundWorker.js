var BackgroundWorker = require( '../src/BackgroundWorker' )


describe( 'BackgroundWorker', function() {

  describe( 'BackgroundWorker#start', function() {

    it( 'should throw exepction if tried to start when allready started', function() {
      var worker

      worker = new BackgroundWorker()

      worker.start()

      expect(function(){ worker.start() })
        .to.throwException()
    })

  })

  describe( 'Running in Iframe', function( done ) {

    before(function() {
      BackgroundWorker._oriHasWorkerSupport = BackgroundWorker.hasWorkerSuppor
      BackgroundWorker.hasWorkerSupport = function(){ return false }
    })

    after(function() {
      BackgroundWorker.hasWorkerSupport = BackgroundWorker._oriHasWorkerSupport
    })

    it('Should run', function( done ) {
      var worker

      worker = new BackgroundWorker()

      worker.define('job', function(){ return 'ran' }.toString())

      worker.start()

      worker.run('job').then(function( res ) {
        expect(res).to.equal('ran')
        done()
      })

    })

    it('should import scripts', function( done ) {

      var worker

      worker = new BackgroundWorker({
        importScripts: ["http://localhost:9876/base/test/import.js"],
      })

      worker.define('func', function(){ return importedFunc() }.toString())

      worker.start()

      worker.run('func').then(function( res ) {
        expect(res).to.equal('imported')
        done()
      })
    })

  })

})
