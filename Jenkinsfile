#!/usr/bin/env groovy

// Used Jenkins plugins:
// * Pipeline GitHub Notify Step Plugin
// * Disable GitHub Multibranch Status Plugin
//

// This script expect following environment variables to be set:
//
// $OCP_HOSTNAME -- hostname of running Openshift cluster
// $OCP_USER     -- Openshift user
// $OCP_PASSWORD -- Openshift user's password
//
// $EXTERNAL_DOCKER_REGISTRY 			-- address of a docker registry
// $EXTERNAL_DOCKER_REGISTRY_USER		-- username to use to authenticate to specified docker registry
// $EXTERNAL_DOCKER_REGISTRY_PASSWORD   -- password/token to use to authenticate to specified docker registry

def prepareTests() {

	// wipeout workspace
	deleteDir()

	dir('oshinko-webui') {
		checkout scm
		sh('npm install')
		sh('bower install')
	}

	// check golang version
	sh('go version')

	// download oc client
	dir('client') {
		sh('curl -LO https://github.com/openshift/origin/releases/download/v3.7.0/openshift-origin-client-tools-v3.7.0-7ed6862-linux-64bit.tar.gz')
		sh('curl -LO https://github.com/openshift/origin/releases/download/v3.7.0/openshift-origin-server-v3.7.0-7ed6862-linux-64bit.tar.gz')
		sh('tar -xzf openshift-origin-client-tools-v3.7.0-7ed6862-linux-64bit.tar.gz')
		sh('tar -xzf openshift-origin-server-v3.7.0-7ed6862-linux-64bit.tar.gz')
		sh('cp openshift-origin-client-tools-v3.7.0-7ed6862-linux-64bit/oc .')
		sh('cp openshift-origin-server-v3.7.0-7ed6862-linux-64bit/* .')
	}

	// login to openshift instance
	sh('oc login https://$OCP_HOSTNAME:8443 -u $OCP_USER -p $OCP_PASSWORD --insecure-skip-tls-verify=true')
	// let's start on a specific project, to prevent start on a random project which could be deleted in the meantime
	sh('oc project testsuite')

	// start xvfb
	sh('Xvfb -ac :99 -screen 0 1280x1024x16 &')
}


def buildUrl
def globalEnvVariables = ["WEBUI_TEST_EXTERNAL_REGISTRY=$EXTERNAL_DOCKER_REGISTRY", "WEBUI_TEST_EXTERNAL_USER=$EXTERNAL_DOCKER_REGISTRY_USER", "WEBUI_TEST_EXTERNAL_PASSWORD=$EXTERNAL_DOCKER_REGISTRY_PASSWORD", "DISPLAY=:99.0"]


node('radanalytics-test') {
	stage('init') {
		// generate build url
		buildUrl = sh(script: 'curl https://url.corp.redhat.com/new?$BUILD_URL', returnStdout: true)
		try {
			githubNotify(context: 'jenkins-ci/oshinko-webui', description: 'This change is being built', status: 'PENDING', targetUrl: buildUrl)
		} catch (err) {
			echo("Wasn't able to notify Github: ${err}")
		}
	}
}

parallel testStandard: {
	node('radanalytics-test') {
		stage('Test standard') {
			withEnv(globalEnvVariables + ["GOPATH=$WORKSPACE", "KUBECONFIG=$WORKSPACE/client/kubeconfig", "PATH+OC_PATH=$WORKSPACE/client"]) {

				try {
					prepareTests()

					// run tests
					dir('oshinko-webui') {
						sh('make test-e2e | tee -a test-standard.log && exit ${PIPESTATUS[0]}')
					}
				} catch (err) {
					try {
						githubNotify(context: 'jenkins-ci/oshinko-webui', description: 'There are test failures', status: 'FAILURE', targetUrl: buildUrl)
					} catch (errNotify) {
						echo("Wasn't able to notify Github: ${errNotify}")
					}
					throw err
				} finally {
					dir('oshinko-webui') {
						archiveArtifacts(allowEmptyArchive: true, artifacts: 'test-standard.log')
					}
				}
			}
		}
	}
}, testSecure: {
	node('radanalytics-test') {
		stage('Test secure') {
			withEnv(globalEnvVariables + ["GOPATH=$WORKSPACE", "KUBECONFIG=$WORKSPACE/client/kubeconfig", "PATH+OC_PATH=$WORKSPACE/client", "WEBUI_TEST_SECURE_USER=$OCP_USER", "WEBUI_TEST_SECURE_PASSWORD=$OCP_PASSWORD"]) {

				try {
					prepareTests()

					// run tests
					dir('oshinko-webui') {
						sh('make test-e2e-secure | tee -a test-secure.log && exit ${PIPESTATUS[0]}')
					}
				} catch (err) {
					try {
						githubNotify(context: 'jenkins-ci/oshinko-webui', description: 'There are test failures', status: 'FAILURE', targetUrl: buildUrl)
					} catch (errNotify) {
						echo("Wasn't able to notify Github: ${errNotify}")
					}
					throw err
				} finally {
					dir('oshinko-webui') {
						archiveArtifacts(allowEmptyArchive: true, artifacts: 'test-secure.log')
					}
				}
			}
		}
	}
}

try {
	githubNotify(context: 'jenkins-ci/oshinko-webui', description: 'This change looks good', status: 'SUCCESS', targetUrl: buildUrl)
} catch (err) {
	echo("Wasn't able to notify Github: ${err}")
}


