describe('Login page functionality', function() {

    it('should login', function() {
        browser.get('http://localhost:8889/');
        element(by.name('username')).sendKeys('admin');
        expect(element(by.css('button[type="submit"]')).getAttribute("disabled")).toEqual('true');
        element(by.name('password')).sendKeys('admin');
        expect(element(by.css('button[type="submit"]')).getAttribute("disabled")).toEqual(null);
        element(by.css('button[type="submit"]')).click();
        expect(browser.getTitle()).toEqual("Spark Cluster Management");
        expect(element(by.tagName('h1')).getText()).toEqual("Clusters");
    });
});


describe('Cluster page functionality', function() {
    it('should display clusters', function() {
        browser.get('http://localhost:8889/');
        element(by.name('username')).sendKeys('admin');
        element(by.name('password')).sendKeys('admin');
        element(by.css('button[type="submit"]')).click();
        expect(element(by.tagName('h1')).getText()).toEqual("Clusters");

        // Restart modal + functionality
        element.all(by.cssContainingText('button', 'Actions')).get(0).click();
        element.all(by.cssContainingText('a', 'Restart')).get(0).click();
        element(by.cssContainingText('button', 'Start')).click();
        // Stop modal + functionality
        element.all(by.cssContainingText('button', 'Actions')).get(0).click();
        element.all(by.cssContainingText('a', 'Delete')).get(0).click();
        element(by.cssContainingText('button', 'Stop')).click();
        // Scale modal + functionality
        element.all(by.cssContainingText('button', 'Actions')).get(0).click();
        element.all(by.cssContainingText('a', 'Scale')).get(0).click();
        element(by.cssContainingText('button', 'Scale')).click();
      });
});
