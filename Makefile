.PHONY : image test-e2e test-e2e-secure

DOCKERFILE_CONTEXT=oshinko-webui-build

image: $(DOCKERFILE_CONTEXT)
	docker build -t oshinko-webui $(DOCKERFILE_CONTEXT)

test-e2e: image
	test/e2e.sh

test-e2e-secure: image
	WEBUI_TEST_SECURE=true test/e2e.sh

zero-tarballs:
	-truncate -s 0 $(DOCKERFILE_CONTEXT)/*.tgz
	-truncate -s 0 $(DOCKERFILE_CONTEXT)/*.tar.gz
