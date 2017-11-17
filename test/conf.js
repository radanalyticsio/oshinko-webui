exports.config = {
  framework: 'jasmine',
  specs: ['spec/all-functionality-insecure.js'],
  baseUrl: 'http://localhost:8080',
  getPageTimeout: 120000,
  allScriptsTimeout: 120000,
  jasmineNodeOpts: {
    defaultTimeoutInterval: 240000
  },
  params: {
    securelogin: {
      name: 'developer',
      password: 'developerpass'
    }
  }
};
