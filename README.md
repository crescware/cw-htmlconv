# cw-attrconv

[![Build Status](https://circleci.com/gh/crescware/cw-attrconv.svg?style=shield&circle-token=64f31a478cb12b6e1457fbce1b966a48a8771ee9)](https://circleci.com/gh/crescware/cw-attrconv)

Converter for HTML attributes.

## Example
See `./test/main-spec.es6`.

### For Browser
```html
<script src="./cw-attrconv.js"></script>
```

```js
var conv = cwAttrconv.default;
conv('<p>HTML</p>', {pattern: 'substr'}).then(function(result) {
  //
});
```

## TODO
- Documentation

## Author
- [OKUNOKENTARO (armorik83)](https://github.com/armorik83)