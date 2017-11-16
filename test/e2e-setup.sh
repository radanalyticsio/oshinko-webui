#!/bin/bash
sudo dnf install -y which npm tar bzip2 wget

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
    sudo dnf install -y java-1.8.0-openjdk
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

    sudo dnf install -y google-chrome-stable
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
