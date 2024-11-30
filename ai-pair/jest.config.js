module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts', '<rootDir>/test/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      sourceMap: true,  // Add this
      diagnostics: {
        ignoreCodes: [151001]  // Add this to ignore source map warnings
      }
    }],
  },
  verbose: true,
  collectCoverage: false,
};