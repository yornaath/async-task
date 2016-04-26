var gulp        = require( 'gulp' )
var browserify  = require( 'gulp-browserify' )
var babelify    = require( 'babelify' )
var rename      = require( 'gulp-rename' )
var uglify      = require( 'gulp-uglify' )
var del         = require( 'del' )


var paths = {
  dist: './dist',
  main: './index.js'
}


gulp.task( 'clean', function( cb ) {
  del( paths.dist, cb )
})

gulp.task('build', ['clean'], function() {
  return gulp.src( paths.main )
    .pipe( browserify({
      transform: [babelify],
      standalone: "AsyncTask"
    }))
    .pipe( uglify() )
    .pipe( rename('AsyncTask.js') )
    .pipe( gulp.dest(paths.dist) )

})

gulp.task( 'default', [ 'build' ] )
