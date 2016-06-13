### Running the app during development

You'll need to have a node environment installed.
I prefer to use nvm (https://github.com/creationix/nvm)
to manage my node environment.
Once that is set up, you can run the following:
npm install
npm install -g bower
bower install

Now you're ready to run the oshinko-webui server.

Set the following environment variables:
OPENSHIFT_OSHINKO_REST=<IP or dns entry of the oshinko rest server>
OPENSHIFT_OSHINKO_REST_PORT=<Port for the oshinko rest server>
OPENSHIFT_NODEJS_PORT=<Port to listen on>  Default:8080

You can pick one of these options:

* install node.js and run `node server.js`

Then navigate your browser to `http://localhost:<port>` to see the app running in
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
karma start test/karma.conf.js

### End to end testing


### Continuous Integration
