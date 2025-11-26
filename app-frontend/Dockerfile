# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Si el frontend consulta el backend via variable d'entorn:
# Valor per defecte per a preprod (relatiu, sense /api)
ARG VITE_API_BASE_URL=/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Serve
FROM nginx:alpine
# Instalar gettext para envsubst
RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html
# Copiar el template en lugar del conf final
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Script de inicio que genera el nginx.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
