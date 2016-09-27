### Running the app during development

You'll need to have a node environment installed.
You might prefer to use nvm (https://github.com/creationix/nvm)
to manage my node environment.
Once that is set up, you can run the following:

    sudo npm install -g grunt-cli
    sudo npm install
    npm install -g bower
    bower install

You need to edit the config.js to point to appropriate Opesnhift and Oshinko-webui IPs

    vim app/config.js
    # replace ORIGIN and OSHINKOHOST value (both will likely be the IP address of your host)

You also need an oauthclient resource in openshift

    vim example/oauthclient.js
    # replace redirectURIs value with correct OSHINKOHOST value (likely your IP address)   

The following must be done by the system:admin user
    
    oc login -u system:admin
    oc create -f  example/oauthclient.js

You also need a edit master-config.yaml of openshift to avoid CORS issue.  Again, <OSHINKOHOST>
is most likely replaced with the IP address of your host.
```
    corsAllowedOrigins:
    - 127.0.0.1
    - 192.168.122.1:8443
    - localhost
    - <OSHINKOHOST>:9000
```

Now you're ready to run the oshinko-webui server.


    grunt serve


Then navigate your browser to `https://127.0.0.1:9000` to see the app running in
your browser.


### Running the app in production
The oshinko-webui is meant to run inside Openshift.  You can build the image
from the Dockerfile.  The resultant image can be run standalone or inside
Openshift.

You will need to set the following environment variables:

    OPENSHIFT_OSHINKO_REST=<IP or dns entry of the oshinko rest server>
    OPENSHIFT_OSHINKO_REST_PORT=<Port for the oshinko rest server>
    OPENSHIFT_NODEJS_PORT=<Port that the oshinko-webui will listen on>  Default:8080


### Running unit tests
To run the unit tests:

    karma start test/karma.conf.js


### End to end testing
You'll need protractor installed:

    npm install -g protractor

<optional> Then run:

    webdriver-manager update

You may need to update `test/conf.js` to point to your correct `baseUrl` [default is `http://localhost:8080`] Or, you can pass `--baseUrl=<your baseUrl>` on the protractor command line

    webdriver-manager start

From another terminal window, you can run:

    protractor test/conf.js

### Continuous Integration
