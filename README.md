AsyncTask
=========

Execute tasks asynchronous tasks without seperate files. In browsers without ```Worker``` support it fallbacks to ```iframe```.

Inn Nodejs it spawns a process using ```child_process```.

### Install

```
npm install async-task
```

### Usage
```javascript
var AsyncTask = require( 'async-task' )

var task = new AsyncTask({
  doInBackground: (a, b) -> a + b
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

#### AsyncTask( doInBackground )

If you pass a function, then that function will run in the background. This is shorter, and it looks like this:

```javascript
var task = new AsyncTask((a, b) -> a + b)
```

#### AsyncTask( doInBackground, options )

If you pass a function and an options object, then that function will run in the background and the options will also be looked. For example:

```javascript
var task = new AsyncTask((a, b) -> a + b, {keepAlive: true})
```

#### asyncTask.execute( args... ):bluebird/Promise

Execute the ```doInBackground``` function with supplied args.


###### Sharing worker example

```javascript
var AsyncTask = require( 'async-task' )
var BackgroundWorker = require( 'background-worker' )

var worker = new BackgroundWorker({})

var taskA = new AsyncTask({
  worker: worker,
  doInBackground: () -> 'a'
})

var taskB = new AsyncTask({
  worker: worker,
  doInBackground: () -> 'b'
})


Promise.all([
  taskA.execute(),
  taskB.execute()
]).then(function(result) {
  result == [ 'a', 'b' ]
  worker.terminate()
})
```

#### Test

```npm run-script test```

### Roadmap

* ```doInBackground``` can return a promise or maybe even a ```generator*``` so you can iterate over ```asyncTask.execute```

*Partially made, with <3 at:*

[![Foo](http://wtw.no/gfx/wtw-logo2.png)](https://github.com/wtw-software/)
