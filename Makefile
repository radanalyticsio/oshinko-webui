.PHONY : image test-e2e test-e2e-secure

DOCKERFILE_CONTEXT=oshinko-webui-build

image: $(DOCKERFILE_CONTEXT)
	docker build -t oshinko-webui $(DOCKERFILE_CONTEXT)

test-e2e: image
	test/e2e.sh

test-e2e-secure: image
	WEBUI_TEST_SECURE=true test/e2e.sh

clean-context:
	-rm -f $(DOCKERFILE_CONTEXT)/Dockerfile
	-rm -rf $(DOCKERFILE_CONTEXT)/modules
	-rm -rf $(DOCKERFILE_CONTEXT)/*.tar.gz

context: clean-context
	concreate generate --descriptor=image.yaml
	cp -R target/image/* $(DOCKERFILE_CONTEXT)
	$(MAKE) zero-tarballs

zero-tarballs:
	-truncate -s 0 $(DOCKERFILE_CONTEXT)/*.tar.gz

