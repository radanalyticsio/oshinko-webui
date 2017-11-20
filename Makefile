.PHONY : image test-e2e test-e2e-secure

image:
	docker build -t oshinko-webui .

test-e2e: image
	test/e2e.sh

test-e2e-secure: image
	WEBUI_TEST_SECURE=true test/e2e.sh
