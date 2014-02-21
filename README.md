AsyncTask
=========

Execute tasks on web Workers without seperate files.

```javascript
var task = new AsyncTask({
  doInBackground: function( a, b ) {
    return a + b
  }
})

task.execute(1, 2, function( result ){
  result === 3
})
```

Or using promises

```javascript
var task = new AsyncTask({
  doInBackground: function( a, b ) {
    return a + b
  }
})

task.execute(1, 2)
    .then(function( result ) {
      result === 3
    })
```
