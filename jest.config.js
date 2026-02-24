module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['./__tests__', './src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false, tsconfig: { jsx: 'react-jsx' } }],
  },
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
};
