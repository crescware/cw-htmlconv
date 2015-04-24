'use strict';
var del = require('del');
var gulp = require('gulp');
var seq = require('run-sequence');
var shell = require('gulp-shell');
var mocha = require('gulp-mocha');

var opt = {
  bin: './bin',
  lib: './lib',
  src: './src',
  test: './test',
  testEspowered: './test-espowered',
  npmbin: './node_modules/.bin'
};

var bin = {
  tsc: '' + opt.npmbin + '/tsc',
  babel: '' + opt.npmbin + '/babel',
  browserify: '' + opt.npmbin + '/browserify'
};

/* clean */
gulp.task('clean', del.bind(null, ['' + opt.src + '/**/*.js', '' + opt.src + '/**/*.js.map', '' + opt.test + '/**/*.js', '' + opt.test + '/**/*.js.map', opt.lib, opt.testEspowered]));

/* ts */
var tsc = '' + bin.tsc + ' -t es5 -m commonjs --noImplicitAny --noEmitOnError';
gulp.task('ts:src_', shell.task(['find ' + opt.src + ' -name "*.ts" | xargs ' + tsc]));
gulp.task('ts:src', function (done) {
  return seq('clean', 'ts:src_', done);
});
gulp.task('ts', function (done) {
  return seq('clean', ['ts:src_'], done);
});

/* babel */
gulp.task('babel:test', shell.task(['' + bin.babel + ' ' + opt.test + ' --plugins babel-plugin-espower --out-dir ' + opt.testEspowered]));

/* watch */
gulp.task('exec-watch:test', ['test'], function () {
  gulp.watch(['' + opt.src + '/**/*.ts', '' + opt.test + '/**/*.es6'], ['test']).on('error', function (err) {
    return process.exit(1);
  });
});
gulp.task('exec-watch:cli', ['build:src'], function () {
  gulp.watch(['' + opt.src + '/**/*.ts'], ['build:src']).on('error', function (err) {
    return process.exit(1);
  });
});

function watch(target) {
  return function () {
    var spawn = (function (_spawn) {
      function spawn() {
        return _spawn.apply(this, arguments);
      }

      spawn.toString = function () {
        return _spawn.toString();
      };

      return spawn;
    })(function () {
      var proc = require('child_process').spawn('gulp', ['exec-watch:' + target], { stdio: 'inherit' });
      proc.on('close', function (c) {
        return spawn();
      });
    });
    spawn();
  };
}

gulp.task('watch:test', watch('test'));
gulp.task('watch:cli', watch('cli'));

/* build */
gulp.task('copy:src', function () {
  gulp.src('' + opt.src + '/**/*.js').pipe(gulp.dest(opt.lib));
});
gulp.task('copy:dts', function () {
  gulp.src('./typings/cw-attrconv/cw-attrconv.d.ts').pipe(gulp.dest('./'));
});
gulp.task('build:standalone', shell.task(['' + bin.browserify + ' -p licensify --standalone cwAttrconv ./index.js -o ./cw-attrconv.js']));
gulp.task('build:src', function (done) {
  return seq('ts:src', ['copy:src', 'copy:dts'], done);
});
gulp.task('build', function (done) {
  return seq('build:src', 'build:standalone', done);
});

/* test */
gulp.task('mocha', function () {
  return gulp.src('' + opt.testEspowered + '/**/*.js').pipe(mocha({ reporter: 'spec' })).on('error', function (err) {
    return process.exit(1);
  });
});
gulp.task('test', function (done) {
  seq('build:src', 'babel:test', 'mocha', done);
});
