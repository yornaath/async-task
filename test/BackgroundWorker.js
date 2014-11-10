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
})
