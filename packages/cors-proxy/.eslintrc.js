module.exports = {
  'env': {
    'es2021': true,
    'node': true
  },
  'extends': 'eslint:recommended',
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
  },
  'overrides': [
    {
      'files': [
        '**/*.spec.js',
        '**/*.spec.ts',
      ],
      'env': {
        'jest': true
      }
    },
    {
      'files': [
        '*.ts'
      ],
      'parserOptions': {
        'project': [
          'tsconfig.json',
        ],
        'createDefaultProgram': true
      },
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      'rules': {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      }
    }
  ]
};
