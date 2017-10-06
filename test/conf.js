exports.config = {
  framework: 'jasmine',
  specs: ['spec/all-functionality.js'],
  baseUrl: 'http://localhost:8080',
  getPageTimeout: 30000,
  allScriptsTimeout: 30000,
  jasmineNodeOpts: {
    defaultTimeoutInterval: 120000
  }
}
