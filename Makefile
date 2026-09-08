PORT ?= 4321

.DEFAULT_GOAL := help

.PHONY: help serve dev open shots og qa qa-dark qa-light clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

serve: ## Start local server on localhost:$(PORT)
	@echo "http://localhost:$(PORT)"
	@python3 -m http.server $(PORT)

dev: ## Start server and open in browser
	@open "http://localhost:$(PORT)" &
	@echo "http://localhost:$(PORT)"
	@python3 -m http.server $(PORT)

open: ## Open localhost:$(PORT) in the default browser
	@open "http://localhost:$(PORT)"

shots: ## Optimise screenshots (requires ImageMagick)
	@./tools/optimise-shots.sh

og: ## Rebuild the Open Graph image (requires Chrome + ImageMagick)
	@./tools/make-og.sh

qa: qa-dark ## Full-page QA render (dark by default)

qa-dark: ## QA render, dark theme
	@./tools/qa-render.sh index.html /tmp/hgshots dark

qa-light: ## QA render, light theme
	@./tools/qa-render.sh index.html /tmp/hgshots light

clean: ## Remove QA render output
	@rm -rf /tmp/hgshots
	@echo "cleaned /tmp/hgshots"
