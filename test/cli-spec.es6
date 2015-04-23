import assert from 'power-assert';
import del from 'del';
import mkdirp from 'mkdirp';
import nexpect from 'nexpect';
import path from 'path';
import fs from 'fs';

const dir = {
  working:  path.resolve(process.cwd(), 'test-cli'),
  fixtures: path.resolve(process.cwd(), 'test/fixtures')
};

describe('cli', () => {
  const bin = path.resolve(process.cwd(), 'bin/attrconv');
  const command = (process.platform === 'win32') ? `node ${bin}` : bin;

  beforeEach(() => {
    del.sync(dir.working);
    mkdirp.sync(dir.working);
  });

  after(() => {
    del.sync(dir.working);
  });

  it('attrconv [inputPath]', (done) => {
    nexpect
      .spawn(command, [`${dir.fixtures}/input.html`])
      .run((err, stdout, exit) => {
        assert(!err);
        assert(exit === 0);
        assert.deepEqual(stdout, [
          '<!DOCTYPE html>',
          '<html>',
          '<head lang="en">',
          '  <meta charset="UTF-8">',
          '  <title>Hello</title>',
          '</head>',
          '<body>',
          '  <h1>Hello</h1>',
          '  <img src="./image.jpg" alt="Image">',
          '</body>',
          '</html>'
        ]);
        done();
      });
  });

  it('attrconv [inputPath] -o [path]', (done) => {
    nexpect
      .spawn(command, [`${dir.fixtures}/input.html`, '-o', `${dir.working}/output.html`])
      .run((err, stdout, exit) => {
        assert(!err);
        assert(exit === 0);
        assert.deepEqual(stdout, []);
        assert(
          fs.readFileSync(`${dir.working}/output.html`, 'utf8'),
          fs.readFileSync(`${dir.fixtures}/input.html`, 'utf8')
        );
        done();
      });
  });
});