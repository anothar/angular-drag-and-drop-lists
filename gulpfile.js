var gulp = require('gulp');
var ts = require('gulp-typescript');
var minify = require('gulp-minify');
var concat = require('gulp-concat');

gulp.task('compile', function() {
    var tsProject = ts.createProject('tsconfig.json');

    var tsResult = tsProject.src().pipe(ts(tsProject));
 
    return tsResult.js.pipe(concat('angular-drag-and-drop-lists.js')).pipe(minify({
        ext:{
            src:'.js',
            min:'.min.js'
        },
        ignoreFiles: ['.min.js']
    })).pipe(gulp.dest('release'));
});

gulp.task('default', ['compile'], function() {
    return gulp.watch('sources/**/*.ts', ['compile']);
})