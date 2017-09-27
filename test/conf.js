exports.config = {
  framework: 'jasmine',
  specs: ['spec/all-functionality.js'],
  baseUrl: 'http://localhost:8080',
  getPageTimeout: 120000,
  allScriptsTimeout: 120000,
  jasmineNodeOpts: {
    defaultTimeoutInterval: 240000
  }
};
