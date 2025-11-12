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