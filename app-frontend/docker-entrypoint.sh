#!/bin/sh
set -e

# Generar nginx.conf desde el template usando envsubst
envsubst '${BACKEND_CONTAINER_NAME} ${SSE_CONTAINER_NAME}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Ejecutar el comando original
exec "$@"