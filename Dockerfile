FROM nodesource/centos7:6.3.1

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY ./package.json /usr/src/app/
COPY ./bower.json /usr/src/app/
COPY ./scripts/launch.sh /usr/src/app/

RUN yum install -y wget git && \
    yum clean all

RUN export CLI_REPO=crobby && \
    export CLI_VER=v0.2.x && \
    pushd /tmp && \
    wget https://github.com/${CLI_REPO}/oshinko-cli/releases/download/${CLI_VER}/oshinko-cli_${CLI_VER}_linux_amd64.tar.gz && \
    tar -zxvf oshinko-cli_${CLI_VER}_linux_amd64.tar.gz && \
    mv oshinko-cli_linux_amd64 /usr/src/app/oshinko-cli && \
    chmod +x /usr/src/app/oshinko-cli && rm -rf /tmp/oshinko-cli* && \
    popd

RUN echo '{ "allow_root": true, "directory": "app/bower_components" }' > /usr/src/app/.bowerrc
RUN npm install
RUN npm install -g bower
RUN bower install

COPY . /usr/src/app

RUN chmod a+rwX -R .

EXPOSE 8080

CMD [ "/usr/src/app/launch.sh" ]
