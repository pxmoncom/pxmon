.PHONY: help build test lint format clean deploy-devnet check idl docker

help:
	@echo "PXMON build targets"
	@echo "  make build        - Build on-chain program (anchor build)"
	@echo "  make test         - Run all tests"
	@echo "  make lint         - Run linters"
	@echo "  make format       - Format all code"
	@echo "  make format-check - Check formatting without modifying"
	@echo "  make check        - Type/compile check without full build"
	@echo "  make idl          - Generate IDL JSON"
	@echo "  make clean        - Remove build artifacts"
	@echo "  make docker       - Build Docker image"

build:
	anchor build

check:
	cargo check --workspace
	cd sdk && npx tsc --noEmit
	cd cli && npx tsc --noEmit
	cd api && npx tsc --noEmit

test:
	anchor test
	cd sdk && npm test
	cd api && npm test
	cd cli && npm test

lint:
	cargo clippy --workspace --no-deps -- -W clippy::all
	cd sdk && npm run lint
	cd cli && npm run lint

format:
	cargo fmt --all
	cd sdk && npx prettier --write "src/**/*.ts"
	cd cli && npx prettier --write "src/**/*.ts"
	cd api && npx prettier --write "src/**/*.ts"

format-check:
	cargo fmt --all -- --check
	cd sdk && npx prettier --check "src/**/*.ts"

idl:
	anchor build
	mkdir -p target/idl
	@echo "IDL generated at target/idl/pxmon.json"

clean:
	cargo clean
	rm -rf sdk/dist cli/dist api/dist
	rm -rf node_modules sdk/node_modules cli/node_modules api/node_modules

deploy-devnet:
	anchor deploy --provider.cluster devnet

docker:
	docker build -t pxmon:latest .
