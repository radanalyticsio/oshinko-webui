FROM nodesource/centos7:6.3.1

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY ./package.json /usr/src/app/
COPY ./bower.json /usr/src/app/
COPY ./scripts /usr/src/app/

RUN yum install -y wget git && \
    yum clean all

RUN pushd /tmp && \
    wget https://github.com/openshift/origin/releases/download/v3.6.0/openshift-origin-client-tools-v3.6.0-c4dd4cf-linux-64bit.tar.gz && \
    tar -xvzf openshift-origin-client-tools-v3.6.0-c4dd4cf-linux-64bit.tar.gz && \
    cp openshift-origin-client-tools-v3.6.0-c4dd4cf-linux-64bit/oc /usr/src/app/ && \
    chmod +x /usr/src/app/oc && rm -rf /tmp/openshift* && \
    popd

RUN echo '{ "allow_root": true, "directory": "app/bower_components" }' > /usr/src/app/.bowerrc
RUN npm install
RUN npm install -g bower
RUN bower install

COPY . /usr/src/app

RUN chmod a+rwX -R .

EXPOSE 8080

CMD [ "/usr/src/app/launch.sh" ]
