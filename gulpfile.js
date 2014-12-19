var gulp        = require( 'gulp' )
var browserify  = require( 'gulp-browserify' )
var rename      = require( 'gulp-rename' )
var del         = require( 'del' )


var paths = {
  bin: './bin',
  main: './index.js'
}


gulp.task( 'clean', function( cb ) {
  del( paths.bin, cb )
})

gulp.task('build', ['clean'], function() {
  return gulp.src( paths.main )
    .pipe( browserify({
      standalone: "AsyncTask"
    }))
    .pipe( rename('AsyncTask.js') )
    .pipe( gulp.dest(paths.bin) )

})

gulp.task( 'default', [ 'build' ] )
