module.exports = {
  'env': {
    'es2021': true,
    'node': true
  },
  'extends': 'eslint:recommended',
  'overrides': [{
    'files': [
      '**/*.spec.js',
    ],
    'env': {
      'jest': true
    }
  }],
  'parserOptions': {
    'ecmaVersion': 'latest',
    'sourceType': 'module'
  },
  'rules': {
    'indent': [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'always'
    ],
    'no-var': 'error'
  }
};
