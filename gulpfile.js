var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var sass        = require('gulp-sass');
var prefix      = require('gulp-autoprefixer');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var babel = require('gulp-babel');
var jsonServer = require('gulp-json-srv');

gulp.task('json-server', function () {
  jsonServer.start({
    data: 'app/resources/db.json',
    port: 25000
  });
});
gulp.task('babel', function(){
  return gulp.src(['app/assets/jsx/*.jsx', 'app/assets/jsx/*.js'])
    .pipe(babel({
      presets: ['react']
    }))
    .pipe(sourcemaps.init())   
    .pipe(concat('EditOrder.js'))
    .pipe(sourcemaps.write('/'))
    .pipe(gulp.dest('_build/assets/js'));
  });


gulp.task('rebuild', function () {
    browserSync.reload();
});

gulp.task('browser-sync', ['sass'], function() {
    browserSync({
        server: {
            baseDir: '_build'
        }
    });
});

gulp.task('copy', function(){
  return gulp.src('app/*.html')
  .pipe(gulp.dest('_build'));
});
gulp.task('copyResources', function(){
  return gulp.src('app/resources/**.*')
  .pipe(gulp.dest('_build/resources'));
});
gulp.task('copyImages', function(){
  return gulp.src(['app/assets/img/**/*'],{ base: 'src'})
  .pipe(gulp.dest('_build/assets/img'));
})

gulp.task('sass', function () {
  gulp.src('app/assets/sass/**/*.sass')
  	.pipe(sourcemaps.init({
  		loadMaps: false,
  		debug: false
  	}))
    .pipe(sass({    
    	includePaths: ['app/assets/sass'],
    	outputStyle: 'nested'
    }).on('error', sass.logError))
    .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
    .pipe(sourcemaps.write('/')) 
    .pipe(gulp.dest('_build/assets/css'))
    .pipe(browserSync.reload({stream:true}))
});

gulp.task('watch', function() {
  gulp.watch(['app/assets/sass/*.sass','app/assets/sass/**/*.sass'], ['sass']);
  gulp.watch(['app/resources/*.**'], ['copyResources']);
  gulp.watch(['app/assets/img/*.**'], ['copyImages']);
  gulp.watch(['app/assets/jsx/*.jsx','app/assets/js/*.js'], ['babel']);
  gulp.watch(['app/*.html'], ['copy']);
  gulp.watch(['_build/*.html'], ['rebuild']);
});

gulp.task('default', ['copyImages','copyResources', 'copy', 'sass', 'babel', 'json-server', 'watch', 'browser-sync' ]);  