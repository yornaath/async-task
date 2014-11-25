AsyncTask
=========

Execute tasks on web Workers without seperate files.

```javascript
var AsyncTask = require( 'async-task' )

var task = new AsyncTask({
  doInBackground: function( a, b ) {
    return a + b
  }
})

task
  .execute(1, 2)
  .then(function( result ) {
    result === 3
  })
  .error( handleError )
  .catch( handleException)
```

*Partially made, with <3 at:*

[![Foo](http://wtw.no/gfx/wtw-logo2.png)](https://github.com/wtw-software/)
