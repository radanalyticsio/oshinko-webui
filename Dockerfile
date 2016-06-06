FROM nodesource/centos7:0.10.45
#FROM centos:7

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY ./package.json /usr/src/app/
COPY ./bower.json /usr/src/app/
COPY ./.bowerrc /usr/src/app/
RUN echo '{ "allow_root": true }' > /usr/src/app/.bowerrc
RUN npm install
RUN npm install -g bower
RUN bower install

COPY . /usr/src/app

EXPOSE 8080

CMD [ "npm", "start" ]
