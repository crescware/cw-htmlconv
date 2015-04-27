import assert from 'power-assert';
import htmlconv_ from '../index';
const htmlconv = htmlconv_.default; // HACK for default by TypeScript 1.5 Alpha

describe('main', () => {
  function parameterized(input, expected, pattern) {
    it(`${input} to be ${expected}`, () => {
      const actual = htmlconv(input, pattern);
      assert(actual === expected);
    });
  }

  parameterized(
    `<p>Text</p>`,
    `<p>Text</p>`
  );

  parameterized(
    `<p>漢字</p>`,
    `<p>漢字</p>`
  );

  parameterized(
    `<p>A&B</p>`,
    `<p>A&B</p>`
  );

  parameterized(
    `<p>A&amp;B</p>`,
    `<p>A&amp;B</p>`
  );

  parameterized(
    `<p>Text<br>Text</p>`,
    `<p>Text<br>Text</p>`
  );

  parameterized(
    `<p><span>Text</span></p>`,
    `<p><span>Text</span></p>`
  );

  parameterized(
    `<!DOCTYPE html><html></html>`,
    `<!DOCTYPE html><html></html>`
  );

  parameterized(
    `<!DOCTYPE html>\n<html>\n</html>`,
    `<!DOCTYPE html>\n<html>\n</html>`
  );

  parameterized(
    `<a href="./">Text</a>`,
    `<a href="./">Text</a>`
  );

  parameterized(
    `<body><h1><img src="image.png" alt="Alternative" width="90" height="53"></h1></body>`,
    `<body><h1><img src="image.png" alt="Alternative" width="90" height="53"></h1></body>`
  );

  parameterized(
    `<p><span><!-- comment --></span></p>`,
    `<p><span><!-- comment --></span></p>`
  );

  parameterized(
    `<select><option selected>Hello</option></select>`,
    `<select><option selected>Hello</option></select>`
  );

  parameterized(
    `<a href="./">Text</a>`,
    `<a conv="./">Text</a>`,
    {
      '*': {
        attr: {'href': 'conv'}
      }
    }
  );

  parameterized(
    `<a href="./" accesskey="A">Text</a>`,
    `<a conv="./" accesskey="A">Text</a>`,
    {
      '*': {
        attr: {'href': 'conv'}
      }
    }
  );

  parameterized(
    `<select><option selected>Hello</option></select>`,
    `<select><option replaced="">Hello</option></select>`,
    {
      '*': {
        attr: {
          'selected': {
            replace: 'replaced'
          }
        }
      }
    }
  );

  parameterized(
    `<select><option selected>Hello</option></select>`,
    `<select><option replaced>Hello</option></select>`,
    {
      '*': {
        attr: {
          'selected': {
            replace: 'replaced',
            emptyValue: true
          }
        }
      }
    }
  );

  parameterized(
    `<a foo="./" baz="value"><span foo="./" baz="value">Span</span>Text</a>`,
    `<a bar="./" baz="value"><span bar="./" qux="value">Span</span>Text</a>`,
    {
      '*': {
        attr: {'foo': 'bar'}
      },
      'span': {
        attr: {'baz': 'qux'}
      }
    }
  );

  parameterized(
    `<p baz="v" abc="a"></p><a foo="./" baz="value"><span foo="./" baz="value">Span</span>Text</a>`,
    `<p baz="v" abc-abc="aa"></p><a bar="./" baz="value"><span bar="./" qux="value">Span</span>Text</a>`,
    {
      '*': {
        attr: {'foo': 'bar'}
      },
      'span': {
        attr: {'baz': 'qux'}
      },
      'p': {
        attr: {'/^(a.*)$/': {
          replace: '$1-$1',
          value: {
            '/^(.*)$/': '$1$1'
          }
        }}
      }
    }
  );

  parameterized(
    `<p baz="v" abc="a"></p><a foo="./" baz="value"><span foo="./" baz="value">Span</span>Text</a>`,
    `<p baz="v" abc-abc="aa"></p><a bar="./" baz="value"><span qux="value" bar="./">Span</span>Text</a>`,
    {
      'span': {
        attr: {'baz': 'qux'}
      },
      'p': {
        attr: {'/^(a.*)$/': {
          replace: '$1-$1',
          value: {
            '/^(.*)$/': '$1$1'
          }
        }}
      },
      '*': {
        attr: {'foo': 'bar'}
      }
    }
  );

  parameterized(
    `<a href="./">漢字</a>`,
    `<a conv="./">&#x6F22;&#x5B57;</a>`,
    {
      '*': {
        attr: {'href': 'conv'}
      }
    }
  );

  parameterized(
    `<a href="./">Text</a>`,
    `<a refref="./">Text</a>`,
    {
      '*': {
        attr: {'/h(.*)/': '$1$1'}
      }
    }
  );

  parameterized(
    `<div><img src="./foo.jpg"><img src="./bar.jpg"></div>`,
    `<div><img crs="./foofoo.png"><img crs="./barbar.png"></div>`,
    {
      '*': {
        attr: {
          src: {
            replace: 'crs',
            value: {
              '/\\./(.*)\\.jpg/': './$1$1.png'
            }
          }
        }
      }
    }
  );

  parameterized(
    `<a href="foo">Text</a>`,
    `<a conv="bar">Text</a>`,
    {
      '*': {
        attr: {href: {
          replace: 'conv',
          value: {foo: 'bar'}
        }}
      }
    }
  );

  parameterized(
    `<a href="foo">Text</a><a href="baz">Text</a>`,
    `<a conv="bar">Text</a><a conv="qux">Text</a>`,
    {
      '*': {
        attr: {
          href: {
            replace: 'conv',
            value: {foo: 'bar', baz: 'qux'}
          }
        }
      }
    }
  );

  parameterized(
    `<input (click)="action()">`,
    `<input ng-click="action()">`,
    {
      '*': {
        attr: {
          '/^\\(([a-zA-Z_][a-zA-Z0-9_]*)\\)$/': 'ng-$1'
        }
      }
    }
  );


  parameterized(
    `<input #name>`,
    `<input ng-model="name">`,
    {
      '*': {
        attr: {
          '/^#(.*)$/': {
            replace: 'ng-model',
            value: {'/.*/': '%a1'}
          }
        }
      }
    }
  );

  parameterized(
    `<input #name>`,
    `<input ng-model="namename">`,
    {
      '*': {
        attr: {
          '/^#(.*)$/': {
            replace: 'ng-model',
            value: {'/.*/': '%a1%a1'}
          }
        }
      }
    }
  );

  parameterized(
    `<input #abcde>`,
    `<input ng-model="dcb">`,
    {
      '*': {
        attr: {
          '/^#.(.)(.)(.).*$/': {
            replace: 'ng-model',
            value: {'/.*/': '%a3%a2%a1'}
          }
        }
      }
    }
  );

  parameterized(
    `<div [innertext]="textbox.value"></div>`,
    `<div innertext="{{textbox.value}}"></div>`,
    {
      '*': {
        attr: {
          '/^\\[([a-zA-Z_][a-zA-Z0-9_]*)\\]$/': {
            replace: '$1',
            value: {'/^(.*)$/': '{{$1}}'}
          }
        }
      }
    }
  );

  parameterized(
    `<li *foreach="#todo of todos"></li>`,
    `<li ng-repeat="todo in todos"></li>`,
    {
      '*': {
        attr: {
          '/^\\*foreach$/': {
            replace: 'ng-repeat',
            value: {
              '/^#(.*)(\\s+)of(\\s+)(.*)$/': '$1$2in$3$4'
            }
          }
        }
      }
    }
  );

  parameterized(
    `<input type="text" #first-name>`,
    `<input type="text" ng-model="ngModel.firstName">`,
    {
      '*': {
        attr: {
          '/^#(.*)$/': {
            replace: 'ng-model',
            value: {
              '/^.*$/': {
                replace: 'ngModel.%a1',
                manipulation: {
                  '%a1': 'camelize'
                }
              }
            }
          }
        }
      }
    }
  );

  parameterized(
    `<div>
      <p (keyup)>Name: {{firstName.value}}</p>
      <input type="text" #first-name (keyup)>
      <p>Name: {{lastName.value}}</p>
      <input type="text" #last-name (keyup)>
    </div>`,
    `<div>
      <p (keyup)>Name: {{firstName.value}}</p>
      <input type="text" ng-model="ngModel.firstName">
      <p>Name: {{lastName.value}}</p>
      <input type="text" ng-model="ngModel.lastName">
    </div>`,
    {
      '*': {
        attr: {
          '(keyup)': {
            replace: '(keyup)',
            emptyValue: true
          },
          '/^#(.*)$/': {
            replace: 'ng-model',
            value: {
              '/^.*$/': {
                replace: 'ngModel.%a1',
                manipulation: {
                  '%a1': 'camelize'
                }
              }
            }
          }
        }
      },
      'input': {
        attr: {
          '(keyup)': {
            remove: true
          }
        }
      }
    }
  );

  parameterized(
    `<div>
      <p (keyup)>Name: {{firstName.value}}</p>
      <input type="text" #first-name (keyup)>
      <p>Name: {{lastName.value}}</p>
      <input type="text" (keyup)>
    </div>`,
    `<div>
      <p (keyup)>Name: {{firstName.value}}</p>
      <input type="text" ng-model="ngModel.firstName">
      <p>Name: {{lastName.value}}</p>
      <input type="text" (keyup)>
    </div>`,
    {
      '*': {
        attr: {
          '(keyup)': {
            replace: '(keyup)',
            emptyValue: true
          },
          '/^#(.*)$/': {
            replace: 'ng-model',
            value: {
              '/^.*$/': {
                replace: 'ngModel.%a1',
                manipulation: {
                  '%a1': 'camelize'
                }
              }
            }
          }
        }
      },
      'input[/^#(.*)$/]': {
        attr: {
          '(keyup)': {
            remove: true
          }
        }
      }
    }
  );

  parameterized(
    `<p>Name: {{firstName.value}}</p>
  <input type="text" #first-name (keyup)>`,
    `<p>Name: {{ngModel.firstName}}</p>
  <input type="text" ng-model="ngModel.firstName">`,
    {
      '*': {
        attr: {
          '/^#(.*)$/': {
            replace: 'ng-model',
            value: {
              '/^.*$/': {
                replace: 'ngModel.%a1',
                manipulation: {
                  '%a1': 'camelize'
                }
              }
            }
          }
        }
      },
      'input[/^#(.*)$/]': {
        attr: {
          '(keyup)': {
            remove: true
          }
        },
        textWithSelector: {
          '*': {
            '/{{(.*)\.value}}/': {
              replace: '{{ngModel.$1}}'
            }
          }
        }
      }
    }
  );

  parameterized(
    `<div class="view" [class.hidden]="todoEdit == todo"></div>`,
    `<div class="view" ng-class="{hidden: todoEdit == todo}"></div>`,
    {
      '*': {
        attr: {
          '/^\\[class\\.(.*)\\]$/': {
            replace: 'ng-class',
            value: {
              '/^(.*)$/': '{%a1: $1}'
            }
          }
        }
      }
    }
  );

  parameterized(
    `<div class="view" [class.aaa]="true"></div>`,
    `<div class="view" ng-class="{aaa: true}"></div>`,
    {
      '*': {
        attr: {
          '/^\\[class\\.(.+)\\]$/': {
            method: 'merge',
            replace: 'ng-class',
            open: '{',
            close: '}',
            separator: ', ',
            valuePattern: '/^(.*)$/',
            valueReplace: '%a1: $1'
          }
        }
      }
    }
  );

  parameterized(
    `<div class="view" [class.aaa]="true" [class.bbb]="false"></div>`,
    `<div class="view" ng-class="{aaa: true, bbb: false}"></div>`,
    {
      '*': {
        attr: {
          '/^\\[class\\.(.+)\\]$/': {
            method: 'merge',
            replace: 'ng-class',
            open: '{',
            close: '}',
            separator: ', ',
            valuePattern: '/^(.*)$/',
            valueReplace: '%a1: $1'
          }
        }
      }
    }
  );

  parameterized(
    `<div foo.a="12345" foo.b="67890"></div><div foo.a="qwert" foo.b="yuiop" bar.a="asdfg" bar.b="hjkl;"></div>`,
    `<div foo-foo="{{a1:234:, b6:789:}}"></div><div foo-foo="{{aq:wer:, by:uio:}}" bar="(a| dfas; b| klhj)"></div>`,
    {
      '*': {
        attr: {
          '/^(foo)\\.(.+)$/': {
            method: 'merge',
            replace: '$1-$1',
            open: '{{',
            close: '}}',
            separator: ', ',
            valuePattern: '/^(.)(.{3}).*$/',
            valueReplace: '%a2$1:$2:'
          },
          '/^(bar)\\.(.+)$/': {
            method: 'merge',
            replace: '$1',
            open: '(',
            close: ')',
            separator: '; ',
            valuePattern: '/^(..)(..).*$/',
            valueReplace: '%a2| $2$1'
          }
        }
      }
    }
  );

  parameterized(
    `<div [innertext]="textbox.value" (click)="action()" #name [class.aaa]="true" [class.bbb]="false"><!-- comment --></div>`,
    `<div innertext="{{textbox.value}}" ng-click="action()" ng-model="name" ng-class="{aaa: true, bbb: false}"><!-- comment --></div>`,
    {
      '*': {
        attr: {
          '/^\\[([a-zA-Z_][a-zA-Z0-9_]*)\\]$/': {
            replace: '$1',
            value: {'/^(.*)$/': '{{$1}}'}
          },
          '/^#(.*)$/': {
            replace: 'ng-model',
            value: {'/.*/': '%a1'}
          },
          '/^\\(([a-zA-Z_][a-zA-Z0-9_]*)\\)$/': 'ng-$1',
          '/^\\[class\\.(.+)\\]$/': {
            method: 'merge',
            replace: 'ng-class',
            open: '{',
            close: '}',
            separator: ', ',
            valuePattern: '/^(.*)$/',
            valueReplace: '%a1: $1'
          }
        }
      }
    }
  );
});