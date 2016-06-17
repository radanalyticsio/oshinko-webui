exports.config = {
  framework: 'jasmine',
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: ['spec/all-functionality.js'],
  baseUrl: 'http://localhost:8080',
  jasmineNodeOpts: {
    defaultTimeoutInterval: 60000
  }
},
