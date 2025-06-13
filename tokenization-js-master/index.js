if (process.env.NODE_ENV === 'production') {
  module.exports = require('./lib/cjs/guesty-tokenization-js.min.js');
} else {
  module.exports = require('./lib/cjs/guesty-tokenization-js.js');
}
