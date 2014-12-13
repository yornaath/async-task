AsyncTask
=========

Execute tasks on web Workers without seperate files.

### Install

```
npm install async-task
```

### Usage
```javascript
var AsyncTask = require( 'async-task' )

var task = new AsyncTask({
  doInBackground: function( a, b ) {
    return a + b
  }
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

#### asyncTask.execute( args... ):bluebird/Promise

Execute the ```doInBackground``` function with supplied args.

### Roadmap

* ```doInBackground``` can return a promise or maybe even a ``generator*``` so you can iterate over ```asyncTask.execute```
* Nodejs support using child_process

*Partially made, with <3 at:*

[![Foo](http://wtw.no/gfx/wtw-logo2.png)](https://github.com/wtw-software/)
