AsyncTask [![Travis](https://api.travis-ci.org/gorillatron/async-task.svg)](https://travis-ci.org/gorillatron/async-task)
=========
Execute tasks asynchronous tasks without seperate files. In browsers without ```Worker``` support it fallbacks to ```iframe```.

Inn Nodejs it spawns a process using ```child_process```.

### Install

```
npm install async-task
```

Also support bower

```
bower install async-task
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

##### Shorthand
```javascript
var task = new AsyncTask( (a, b) -> a + b, options )
```

### API

#### AsyncTask( doInBackground, options )

Creates a new AsyncTask

##### options

* ```options.doInBackground``` The work(function) to be done in the worker if the first argument isnt the task.
* ```options.keepAlive``` Keep worker alive so ```.execute``` can be called multiple times.
* ```options.worker``` Supply worker if you want to share worker between tasks. **NB!: termination of worker is left to the user**

#### asyncTask.execute( args... ):Promise

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
