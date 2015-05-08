'use strict';
import 'espower-babel/guess';
import del   from 'del';
import gulp  from 'gulp';
import seq   from 'run-sequence';
import shell from 'gulp-shell';
import mocha from 'gulp-mocha';

const paths = {
  bin:    './bin',
  lib:    './lib',
  src:    './src',
  test:   './test',
  npmbin: './node_modules/.bin'
};

const bin = {
  babel:      `${paths.npmbin}/babel`,
  browserify: `${paths.npmbin}/browserify`,
  eslint:     `${paths.npmbin}/eslint`
};

/* clean */
gulp.task('clean', del.bind(null, [paths.lib]));

/* eslint */
gulp.task('eslint:src', shell.task([`${bin.eslint} ${paths.src}`]));

/* babel */
gulp.task('babel:src', shell.task([`${bin.babel} ${paths.src} --out-dir ${paths.lib}`]));

/* build */
const globalName = 'cwHtmlconv';
gulp.task('build:standalone', shell.task([`${bin.browserify} -p licensify --standalone ${globalName} ./index.js -o ./cw-htmlconv.js`]));
gulp.task('build:src', (done) => seq('eslint:src', 'babel:src', done));
gulp.task('build',     (done) => seq('build:src', 'build:standalone', done));

/* test */
gulp.task('mocha', () => {
  gulp
    .src(`${paths.test}/**/*.js`)
    .pipe(mocha({reporter: 'spec'}))
    .on('error', (err) => process.exit(1));
});
gulp.task('test', (done) => {seq('build:src', 'mocha', done)});

/* watch */
function watch(target) {
  return () => {
    const spawn = () => {
      const proc = require('child_process').spawn('gulp', [`exec-watch:${target}`], {stdio: 'inherit'});
      proc.on('close', (c) => spawn());
    };
    spawn();
  };
}

gulp.task('exec-watch:test', ['test'], () => {
  gulp
    .watch([`${paths.src}/**/*.js`, `${paths.test}/**/*.js`], ['test'])
    .on('error', (err) => process.exit(1));
});
gulp.task('exec-watch:cli', ['build:src'], () => {
  gulp
    .watch([`${paths.src}/**/*.js`], ['build:src'])
    .on('error', (err) => process.exit(1));
});

gulp.task('watch', watch('test'));
gulp.task('watch:cli',  watch('cli'));
