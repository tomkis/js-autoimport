// Plain old JS to avoid transpiling, and for sake of testability

var acorn = require('acorn-jsx');
var fs = require('fs');
var _ = require('lodash');

var input = _.last(process.argv);
var noFile = _.contains(process.argv, '--no-file');

function parse(input) {
  var parsingConfig = {
    ecmaVersion: 6,
    sourceType: 'module',
    plugins: {
      jsx: true
    }
  };

  try {
    console.log(JSON.stringify(acorn.parse(input, parsingConfig)));
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
}

if (noFile) {
  parse(input);
} else {
  fs.readFile(input, function(err, data) {
    if (err) {
      console.error(err);
      process.exit(1);
    } else {
      parse(data);
    }
  });
}
