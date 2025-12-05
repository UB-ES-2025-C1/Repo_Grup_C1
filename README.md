# Repo_Grup_C1

El proyecto **CinemaUB** está actualmente desplegado en un servidor remoto y funcionando de manera continua.
Puedes acceder a la aplicación en:

[https://cinemaub.llurbatech.com/](https://cinemaub.llurbatech.com/)

El servidor está configurado para mantener el frontend y backend de manera activa permanentemente. No hace falta iniciar nada manualmente para acceder a la versión en producción.

Si deseas ejecutar el proyecto localmente puedes seguir las siguientes indicaciones.

## Cómo desplegar este proyecto
Para desplegarlo, inicia dos terminales diferentes del proyecto: una para el backend y otra para el frontend, y ejecuta el siguiente código:

## Terminal del backend

### Navega al directorio del backend
```
cd backend
```

### Dependencias del backend
```
pip install -r requirements.txt
```

### Prepara la base de datos y carga la database reducida
```
python manage.py makemigrations
python manage.py migrate
python manage.py load_movies_enriched --copy-images
```

### Inicia el backend
```
set DEBUG=True
python manage.py runserver
```

Usa el siguiente usuario admin:  
- Usuario: admin  
- Contraseña: password

### Backend Testing Setup

Ejecutar los tests

```
# si aún no lo has hecho:
# cd backend
python manage.py test -v 2
```
Generar htmlcov(coverage de los unit tests backend):
pip install -r requirements.txt
coverage run manage.py test movies
coverage html # o coverage report (si quieres verlo rápidamente en terminal)

Crear venv-locust para hacer pruebas con locustfile.py(para la pueba de stress):
python -m venv venv-locust
.\venv-locust\Scripts\actívate 
pip install locust
locust -f locustfile.py #Al abrir la interfaz locust poner host = https://cinemaub-beta.llurbatech.com/

## Terminal del frontend

### Navega al directorio del frontend
```
cd app-frontend
```

### Dependencias del frontend
```
npm install
```

### Inicia el frontend
```
npm run dev
```

### Frontend Testing Setup

El proyecto incluye soporte de tests unitarios con Vitest y Vue Test Utils.

    package.json: contiene las dependencias necesarias para testing (vitest, @vue/test-utils, jsdom, @vitest/ui) y los scripts para ejecutarlos.

    vitest.config.js: configura el entorno de pruebas, indicando que se use jsdom (simula un navegador) y el plugin oficial de Vue.


Ejecutar los tests

```
# si aún no lo has hecho:
# cd app-frontend
npm install
npm test
```

#Generar carpeta coverage de los unit tests en frontend:
npm install
npm run test:coverage


### Testing con Cypress (BEHAVIOUR DRIVEN DEVELOPMENT)

El proyecto incluye tests end-to-end (E2E) con Cypress para probar el flujo completo de la aplicación.

#### Requisitos previos

Asegúrate de que el backend y el frontend estén ejecutándose antes de correr los tests:

1. **Backend**: Debe estar corriendo en `http://127.0.0.1:8000` (o la URL configurada en `VITE_API_BASE_URL`)
2. **Frontend**: Debe estar corriendo en `http://localhost:5173` (puerto por defecto de Vite)

#### Ejecutar los tests de Cypress

**Opción 1: Interfaz gráfica de Cypress (recomendado para desarrollo)**

Abre la interfaz interactiva de Cypress donde puedes ver los tests ejecutándose en tiempo real:

```bash
# Desde el directorio app-frontend
npm run cypress:open
```

Esto abrirá la aplicación de Cypress donde podrás:
- Ver todos los tests disponibles
- Ejecutar tests individuales o todos a la vez
- Ver la ejecución en tiempo real en un navegador
- Depurar tests fácilmente

#### Estructura de los tests

Los tests E2E se encuentran en `app-frontend/cypress/e2e/`:

- `home.cy.js` - Tests del catálogo de películas
- `login.cy.js` - Tests de autenticación
- `register.cy.js` - Tests de registro de usuarios
- `movie-info.cy.js` - Tests de detalle de película
- `rate-movie.cy.js` - Tests de valoración de películas

#### Configuración

La configuración de Cypress se encuentra en `app-frontend/cypress.config.js`:

- `baseUrl`: Configurado para `http://localhost:5173` (puerto por defecto de Vite)
- Los intercepts de las peticiones API se configuran en cada test individual

## Servidor redis

### Requisitos previos

- Docker (https://www.docker.com/)
  - En Windows/Mac se recomienda Docker Desktop.
- Docker Compose (incluido en Docker Desktop)

### Inicia el servidor redis

Para crear el docker, ejecuta

```
docker run --name redis-sse -p 6379:6379 -d redis
```

Si ya lo tienes creado y quieres iniciarlo, ejecuta

```
docker start redis-sse
```

### Deten el servidor redis

El docker no se parará automaticamente. Para pararlo, ejecuta

```
docker stop redis-sse
```

## Terminal del servidor SSE

### Navega al directorio del servidor SSE
```
cd sse
```

### Dependencias del SSE
```
pip install -r requirements.txt
```

### Inicia el servidor SSE
```
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```
