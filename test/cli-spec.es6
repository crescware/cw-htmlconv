import assert from 'power-assert';
import del from 'del';
import mkdirp from 'mkdirp';
import nexpect from 'nexpect';
import path from 'path';

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

  it('attrconv [inputFile]', (done) => {
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
});