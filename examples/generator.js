var Promise   = require( 'bluebird' )
var AsyncTask = require( '../src/AsyncTask' )
var co        = require( 'co' )

var a = [1,2,3,4,5]

var task = new AsyncTask(function(n){
  return n * 2
}, {keepAlive: true})

var double = co.wrap(function*() {
  var nums = yield Promise.map(a, function( n ) { return task.execute(n) })
  return nums
})

double()
  .then(function( res ) {
    console.log(res)
  })
  .finally(function( err ) {
    task._worker.terminate()
  })
