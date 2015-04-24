import assert from 'power-assert';
import del from 'del';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import {exec} from 'child_process';

const dir = {
  working:  path.resolve(process.cwd(), 'test-cli'),
  fixtures: path.resolve(process.cwd(), 'test/fixtures')
};

describe('cli', () => {
  const bin = path.resolve(process.cwd(), 'bin/cw-attrconv');
  const command = (process.platform === 'win32') ? `node ${bin}` : bin;

  before(() => {
    mkdirp.sync(dir.working);
  });

  after(() => {
    del.sync(dir.working);
  });

  it('cw-attrconv [inputPath]', (done) => {
    exec([command, ...[`${dir.fixtures}/input.html`]].join(' '), (err, stdout, stderr) => {
      assert(!err);
      assert.equal(stdout, `<!DOCTYPE html>
<html>
<head lang=\"en\">
  <meta charset=\"UTF-8\">
  <title>Hello</title>
</head>
<body>
  <h1>Hello</h1>
  <img src=\"./image.jpg\" alt=\"Image\">
</body>
</html>

`
      );
      done();
    });
  });

  it('cw-attrconv [inputPath] -o [path]', (done) => {
    exec([command, ...[`${dir.fixtures}/input.html`, '-o', `${dir.working}/output01.html`]].join(' '), (err, stdout, stderr) => {
      assert(!err);
      assert(stdout ===  "");

      const output = fs.readFileSync(`${dir.working}/output01.html`, 'utf8');
      const expected = fs.readFileSync(`${dir.fixtures}/expected01.html`, 'utf8');
      assert(output === expected);

      done();
    });
  });

  it('cw-attrconv [inputPath] -t [html] -o [path]', (done) => {
    exec([command, ...[`${dir.fixtures}/input.html`, '-t', '\'<p>Hello</p>\'', '-o', `${dir.working}/output01.html`]].join(' '), (err, stdout, stderr) => {
      assert(!err);
      assert(stdout ===  "");

      // -t ignored when specified inputPath
      const output = fs.readFileSync(`${dir.working}/output01.html`, 'utf8');
      const expected = fs.readFileSync(`${dir.fixtures}/expected01.html`, 'utf8');
      assert(output === expected);

      done();
    });
  });

  it('cw-attrconv [inputPath] --patterns-text [text] -o [path]', (done) => {
    exec([command, ...[`${dir.fixtures}/input.html`, '--patterns-text', '\'{\"src\": \"crs\"}\'', '-o', `${dir.working}/output02.html`]].join(' '), (err, stdout, stderr) => {
      assert(!err);
      assert(stdout ===  "");

      const output = fs.readFileSync(`${dir.working}/output02.html`, 'utf8');
      const expected = fs.readFileSync(`${dir.fixtures}/expected02.html`, 'utf8');
      assert(output === expected);

      done();
    });
  });

  it('cw-attrconv [inputPath] -p [path] -o [path]', (done) => {
    exec([command, ...[`${dir.fixtures}/input.html`, '-p', `${dir.fixtures}/patterns.json`, '-o', `${dir.working}/output03.html`]].join(' '), (err, stdout, stderr) => {
      assert(!err);
      assert(stdout ===  "");

      const output = fs.readFileSync(`${dir.working}/output03.html`, 'utf8');
      const expected = fs.readFileSync(`${dir.fixtures}/expected03.html`, 'utf8');
      assert(output === expected);

      done();
    });
  });

  it('cw-attrconv -t [html] -o [path]', (done) => {
    exec([command, ...['-t', '\'<p>Hello</p>\'', '-o', `${dir.working}/output04.html`]].join(' '), (err, stdout, stderr) => {
      assert(!err);
      assert(stdout ===  "");

      const output = fs.readFileSync(`${dir.working}/output04.html`, 'utf8');
      const expected = fs.readFileSync(`${dir.fixtures}/expected04.html`, 'utf8');
      assert(output === expected);

      done();
    });
  });

  it('cw-attrconv -t [html] --patterns-text [text] -o [path]', (done) => {
    exec([command, ...['-t', '\'<img src="./image.jpg">\'', '--patterns-text', '\'{\"src\": \"crs\"}\'', '-o', `${dir.working}/output05.html`]].join(' '), (err, stdout, stderr) => {
      assert(!err);
      assert(stdout ===  "");

      const output = fs.readFileSync(`${dir.working}/output05.html`, 'utf8');
      const expected = fs.readFileSync(`${dir.fixtures}/expected05.html`, 'utf8');
      assert(output === expected);

      done();
    });
  });

  it('cw-attrconv -t [html] -p [path] -o [path]', (done) => {
    exec([command, ...['-t', '\'<meta charset="UTF-8">\'', '-p', `${dir.fixtures}/patterns.json`, '-o', `${dir.working}/output06.html`]].join(' '), (err, stdout, stderr) => {
      assert(!err);
      assert(stdout ===  "");

      const output = fs.readFileSync(`${dir.working}/output06.html`, 'utf8');
      const expected = fs.readFileSync(`${dir.fixtures}/expected06.html`, 'utf8');
      assert(output === expected);

      done();
    });
  });
});