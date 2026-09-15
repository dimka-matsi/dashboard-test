#!/bin/sh
# nginx запускает все *.sh из docker-entrypoint.d/ по алфавиту перед стартом;
# без этого docker compose просто стримит логи nginx без подсказки, куда идти.
set -eu
echo "  ➜  Local:   http://localhost:${WEB_PORT:-8080}/"
