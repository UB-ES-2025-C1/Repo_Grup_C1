# Repo_Grup_C1

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

## Terminal del frontend

### Navega al directorio del frontend
```
cd app-frontend
```

### Dependencias del frontend
```
npm install
npm install axios
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
cd app-frontend
npm install
npm test
```