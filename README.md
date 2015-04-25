# cw-htmlconv

[![Build Status](https://travis-ci.org/crescware/cw-htmlconv.svg?branch=master)](https://travis-ci.org/crescware/cw-htmlconv)

Converter for HTML attributes.

## Example
See `./test/main-spec.es6`.

### For Browser
```html
<script src="./cw-htmlconv.js"></script>
```

```js
var conv = cwHtmlconv.default;
conv('<p>HTML</p>', {pattern: 'substr'}).then(function(result) {
  //
});
```

## TODO
- Documentation

## Author
- [OKUNOKENTARO (armorik83)](https://github.com/armorik83)