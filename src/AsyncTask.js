
import BackgroundWorker from 'background-worker'
import uuid             from 'uuid'


export default class AsyncTask {

  constructor( doInBackground, options ) {

    if( typeof doInBackground === 'object' ) {
      options = doInBackground
      doInBackground = options.doInBackground
    }

    this.options = options || {}

    this.uuid = uuid.v4()

    this.hasExecuted = false
    this.keepAlive = this.options.keepAlive
    this.sharingworker = false

    this.doInBackground = doInBackground

    if( typeof this.doInBackground !== 'function' ) {
			console.warn( 'AsyncTask[' + this.uuid  + '].doInBackground is not function', this )
    }

    if( this.options.worker ) {
      this.sharingworker = true
      this.setWorker( this.options.worker )
    }
  }

  setWorker(worker) {
    this.worker = worker
    this.worker.define( this.uuid + '::doInBackground', this.doInBackground.toString() )
    return this.worker
  }

  execute() {
    var worker, args, taskPromise

    if( this.hasExecuted && !this.keepAlive ) {
      throw new Error( 'Cannot execute a allready executed AsyncTask' )
    }

    if( !this.worker ) {
      this.setWorker( new BackgroundWorker({}) )
    }

    this.hasExecuted = true

    worker = this.worker
    args = Array.prototype.slice.call( arguments )

    taskPromise = worker.run( this.uuid + '::doInBackground', args )

    if( !this.keepAlive && !this.sharingworker ) {
      taskPromise
        .then(function() { worker.terminate() })
        .catch(function() { worker.terminate() })
    }

    return taskPromise
  }

}
