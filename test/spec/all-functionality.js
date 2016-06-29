describe('Login page functionality', function() {

    it('should login and display the clusters page', function() {
        browser.get('');
        element(by.name('username')).sendKeys('admin');
        expect(element(by.css('button[type="submit"]')).getAttribute("disabled")).toEqual('true');
        element(by.name('password')).sendKeys('admin');
        expect(element(by.css('button[type="submit"]')).getAttribute("disabled")).toEqual(null);
        element(by.css('button[type="submit"]')).click();
        expect(browser.getTitle()).toEqual("Spark Cluster Management");
        expect(element(by.tagName('h2')).getText()).toEqual("Spark Clusters");
    });
});


describe('Cluster page functionality', function() {
    it('should display clusters', function() {
        var EC = protractor.ExpectedConditions;
        browser.get('/#/login');
        element(by.name('username')).sendKeys('admin');
        element(by.name('password')).sendKeys('admin');
        element(by.css('button[type="submit"]')).click();
        expect(element(by.tagName('h2')).getText()).toEqual("Spark Clusters");

        // Create a cluster
        element(by.id('startbutton')).click();
        element(by.id('clustername')).sendKeys('testcluster');
        element(by.id('createbutton')).click();
        browser.wait(EC.visibilityOf(element(by.name('deletebutton-testcluster'))));

        // Scale
        element(by.name('scalebutton-testcluster')).click();
        element(by.name('numworkers')).sendKeys(protractor.Key.CONTROL, "a", protractor.Key.NULL, "3");
        element(by.id('scalebutton')).click();
        browser.get('/#/clusters');
        browser.wait(EC.textToBePresentInElement(element(by.name('workercount-testcluster')), "3"));

        // Scale down
        element(by.name('scalebutton-testcluster')).click();
        element(by.name('numworkers')).sendKeys(protractor.Key.CONTROL, "a", protractor.Key.NULL, "2");
        element(by.id('scalebutton')).click();
        browser.get('/#/clusters');
        browser.wait(EC.textToBePresentInElement(element(by.name('workercount-testcluster')), "2"));

        // Delete
        browser.get('/#/clusters');
        browser.wait(EC.visibilityOf(element(by.name('deletebutton-testcluster'))));
        element(by.name('deletebutton-testcluster')).click();
        element(by.id('deletebutton')).click();
        browser.get('/#/clusters');
      });
});
