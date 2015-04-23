'use strict';
var del = require('del');
var gulp = require('gulp');
var seq = require('run-sequence');
var shell = require('gulp-shell');
var mocha = require('gulp-mocha');

var opt = {
  bin:           './bin',
  lib:           './lib',
  src:           './src',
  test:          './test',
  testEspowered: './test-espowered'
};

/* clean */
gulp.task('clean', del.bind(null, [
  `${opt.src }/**/*.js`,
  `${opt.src }/**/*.js.map`,
  `${opt.test}/**/*.js`,
  `${opt.test}/**/*.js.map`,
  opt.lib,
  opt.testEspowered
]));

/* ts */
var tsc = 'tsc -t es5 -m commonjs --noImplicitAny --noEmitOnError';
gulp.task('ts:src_', shell.task([`find ${opt.src} -name *.ts | xargs ${tsc}`]));
gulp.task('ts:src',  function(done) {seq('clean', 'ts:src_', done)});
gulp.task('ts',      function(done) {seq('clean', ['ts:src_'], done)});

/* babel */
gulp.task('babel:test', shell.task([`babel ${opt.test} --plugins babel-plugin-espower --out-dir ${opt.testEspowered}`]));

/* watch */
gulp.task('exec-watch:test', ['test'], function() {
  gulp.watch([`${opt.src}/**/*.ts`, `${opt.test}/**/*.es6`], ['test'])
    .on('error', function(err) {
      process.exit(1);
    });
});
gulp.task('exec-watch:cli', ['build:src'], function() {
  gulp.watch([`${opt.src}/**/*.ts`], ['build:src'])
    .on('error', function(err) {
      process.exit(1);
    });
});


function watch(target) {
  return function() {
    var spawn = function() {
      var proc = require('child_process').spawn('gulp', [`exec-watch:${target}`], {stdio: 'inherit'});
      proc.on('close', function(c) {
        spawn();
      });
    };
    spawn();
  };
}

gulp.task('watch:test', watch('test'));
gulp.task('watch:cli',  watch('cli'));

/* build */
gulp.task('copy:src', function() {
  gulp.src(`${opt.src}/**/*.js`)
    .pipe(gulp.dest(opt.lib));
});
gulp.task('build:src', function(done) {seq(['clean', 'ts:src'], 'copy:src', done)});

/* test */
gulp.task('mocha', function() {
  return gulp.src(`${opt.testEspowered}/**/*.js`)
    .pipe(mocha({reporter: 'spec'}))
    .on('error', function(err) {
      process.exit(1);
    });
});
gulp.task('test', function(done) {seq('ts:src', 'babel:test', 'mocha', done)});