FROM node:argon

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app


# Install app dependencies
COPY package.json /usr/src/app/
RUN echo '{ "allow_root": true, "directory": "bower_components" }' > /usr/src/app/.bowerrc
RUN npm install
RUN npm install -g grunt-cli
RUN npm install -g bower
RUN bower install


RUN chmod a+rwX -R .
RUN chmod +x bin/run

EXPOSE 9000
CMD [ "bin/run" ]
