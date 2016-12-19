FROM nodesource/centos7:6.3.1

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY ./package.json /usr/src/app/
COPY ./bower.json /usr/src/app/
COPY ./scripts/launch.sh /usr/src/app/

RUN yum install -y golang make git && \
    yum clean all

ENV GOPATH /go
RUN mkdir -p /go/src/github.com/radanalyticsio && \
    cd /go/src/github.com/radanalyticsio && \
    git clone https://github.com/radanalyticsio/oshinko-cli

RUN cd /go/src/github.com/radanalyticsio/oshinko-cli && \
    make build && \
    cp _output/oshinko-cli /usr/src/app && \
    chmod +x /usr/src/app/oshinko-cli && rm -rf /go

RUN echo '{ "allow_root": true, "directory": "app/bower_components" }' > /usr/src/app/.bowerrc
RUN npm install
RUN npm install -g bower
RUN bower install

COPY . /usr/src/app

RUN chmod a+rwX -R .

EXPOSE 8080

CMD [ "/usr/src/app/launch.sh" ]
