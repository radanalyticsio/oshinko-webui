#!/bin/bash
sudo dnf install which npm tar bzip2 wget

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

which oc
if [ "$?" -ne 0 ]; then
    wget https://github.com/openshift/origin/releases/download/v3.6.1/openshift-origin-client-tools-v3.6.1-008f2d5-linux-64bit.tar.gz
    tar -xvzf openshift-origin-client-tools-v3.6.1-008f2d5-linux-64bit.tar.gz
    sudo cp openshift-origin-client-tools-v3.6.1-008f2d5-linux-64bit/oc /usr/local/bin
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
