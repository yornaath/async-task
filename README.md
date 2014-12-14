AsyncTask
=========

Execute tasks on web Workers without seperate files. In browsers without ```Worker``` support it fallbacks to ```iframe```.

Nodejs support using ```child_process``` is under way.

### Install

```
npm install async-task
```

### Usage
```javascript
var AsyncTask = require( 'async-task' )

var task = new AsyncTask({
  doInBackground: -> a + b
})

task.execute(1, 2)
  .then(function( result ) {
    result === 3
  })
  .catch( handleException )
```

### API

#### AsyncTask( options )

Creates a new AsyncTask

##### options

* ```options.doInBackground``` The work(function) to be done in the worker.
* ```options.keepAlive``` Keep worker alive so ```.execute``` can be called multiple times.
* ```options.worker``` Supply worker if you want to share worker between tasks. **NB!: termination of worker is left to the user**

#### asyncTask.execute( args... ):bluebird/Promise

Execute the ```doInBackground``` function with supplied args.


###### Sharing worker example

```javascript
var AsyncTask = require( 'async-task' )
var BackgroundWorker = require( 'background-worker' )

var worker = new BackgroundWorker({})

var taskA = new AsyncTask({
  worker: worker,
  doInBackground: -> 'a'
})

var taskB = new AsyncTask({
  worker: worker,
  doInBackground: -> 'b'
})


Promise.all([
  taskA.execute(),
  taskB.execute()
]).then(function(result) {
  result == [ 'a', 'b' ]
  worker.terminate()
})

```

### Roadmap

* ```doInBackground``` can return a promise or maybe even a ```generator*``` so you can iterate over ```asyncTask.execute```
* Nodejs support using child_process

*Partially made, with <3 at:*

[![Foo](http://wtw.no/gfx/wtw-logo2.png)](https://github.com/wtw-software/)
