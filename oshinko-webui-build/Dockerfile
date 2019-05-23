# Copyright 2017 Red Hat
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# ------------------------------------------------------------------------
#
# This is a Dockerfile for the oshinko-webui-openshift:0.5.5 image.

FROM centos:7

USER root

RUN yum install -y centos-release-scl \
    && yum clean all && rm -rf /var/cache/yum



# Install required RPMs and ensure that the packages were installed
RUN yum install -y wget git bzip2 rh-nodejs8 \
    && yum clean all && rm -rf /var/cache/yum \
    && rpm -q wget git bzip2 rh-nodejs8


# Add all artifacts to the /tmp/artifacts
# directory
COPY \
    openshift-origin-client-tools-v3.11.0-0cbc58b-linux-64bit.tar.gz \
    /tmp/artifacts/


# Environment variables
ENV \
    JBOSS_IMAGE_NAME="oshinko-webui-openshift" \
    JBOSS_IMAGE_VERSION="0.5.5" 

# Labels
LABEL \
      io.cekit.version="2.2.7"  \
      io.openshift.expose-services="8080/tcp:webcache"  \
      name="oshinko-webui-openshift"  \
      org.concrt.version="2.2.7"  \
      version="0.5.5" 

# Exposed ports
EXPOSE 8080
# Add scripts used to configure the image
COPY modules /tmp/scripts

# Custom scripts
USER root
RUN [ "bash", "-x", "/tmp/scripts/update_os/install" ]

USER root
RUN [ "bash", "-x", "/tmp/scripts/npm_bower/install" ]

USER root
RUN [ "bash", "-x", "/tmp/scripts/launch/install" ]

USER root
RUN [ "bash", "-x", "/tmp/scripts/oc/install" ]

USER root
RUN [ "bash", "-x", "/tmp/scripts/app/install" ]

USER root
RUN [ "bash", "-x", "/tmp/scripts/chown/install" ]

USER root
RUN rm -rf /tmp/scripts
USER root
RUN rm -rf /tmp/artifacts

USER 185

# Specify the working directory
WORKDIR /usr/src/app


CMD ["/usr/src/app/launch.sh"]

