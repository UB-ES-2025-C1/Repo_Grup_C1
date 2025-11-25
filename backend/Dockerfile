FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir gunicorn

COPY . .

# Copiar y hacer ejecutable el script de entrada
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Si uses Whitenoise per estàtics, pots fer:
# RUN python manage.py collectstatic --noinput

ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "cinemaub.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "90"]