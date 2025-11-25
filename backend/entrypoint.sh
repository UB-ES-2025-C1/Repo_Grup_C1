#!/bin/bash
set -e

echo "Ejecutando makemigrations..."
python manage.py makemigrations

echo "Ejecutando migrate..."
python manage.py migrate

echo "Migraciones completadas. Iniciando servidor..."
exec "$@"

