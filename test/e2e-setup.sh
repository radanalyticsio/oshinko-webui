#!/bin/bash

which dnf
if [ "$?" -eq 0 ]; then
    INSTALL=dnf
else
    INSTALL=yum
fi

sudo $INSTALL install -y which npm tar bzip2 wget xorg-x11-server-Xvfb

which bower
if [ "$?" -ne 0 ]; then
    sudo npm install -g bower
fi

which protractor
if [ "$?" -ne 0 ]; then
    sudo npm install -g protractor
fi

which karma
if [ "$?" -ne 0 ]; then
    sudo npm install -g karma-cli
fi

which java
if [ "$?" -ne 0 ]; then
    sudo $INSTALL install -y java-1.8.0-openjdk
fi

which google-chrome-stable
if [ "$?" -ne 0 ]; then
    sudo bash -c 'cat << EOF > /etc/yum.repos.d/google-chrome.repo
[google-chrome]
name=google-chrome - \$basearch
baseurl=http://dl.google.com/linux/chrome/rpm/stable/\$basearch
enabled=1
gpgcheck=1
gpgkey=https://dl-ssl.google.com/linux/linux_signing_key.pub
EOF'

    sudo $INSTALL install -y google-chrome-stable
fi

nodeversion=$(node --version | cut -d '.' -f1)
nodeversion="$((${nodeversion#v}))"
if [ "$nodeversion" -lt 6 ]; then
    echo
    echo '****************************************************************************************************************************************'
    echo Looks like your node version is less than 6 which is required for the test
    echo You can follow these instructions to upgrade it https://nodejs.org/en/download/package-manager/#enterprise-linux-and-fedora
    echo '****************************************************************************************************************************************'
    echo
    exit 1
fi


sudo webdriver-manager update
npm install
bower install

which docker
if [ "$?" -ne 0 ]; then
    echo *** Docker is not installed, it will be necessary to run the tests.
fi


which oc
if [ "$?" -ne 0 ]; then
    echo *** The 'oc' client is not installed, it will be necessary to run the tests
fi
