# Exploratory Testing – Sprint 2
Tester: Christian  
Fecha: 23/11/2025

---
# Charter 1 – Login / Logout / Sesión

## Login
- [OK] Login con credenciales válidas   
- [OK] Credenciales incorrectas 
- [OK] Campos vacíos 
- [OK] Redirección correcta tras login 


---

# Charter 2 – Registro de usuario (Sign up)
##  Registro
- [OK] Registro exitoso 
- [OK] Contraseñas no coinciden 
- [OK] Email ya usado 
- [OK] Campos vacíos 
- [OK] Redirección tras éxito 

---

# Charter 3 – Home: búsqueda, filtros, paginación
##  Búsqueda
- [OK] Título existente 
- [OK] Título inexistente 
- [OK] Búsqueda vacía 

## Filtros
- [OK] Filtro por género 
- [OK] Filtro por año 
- [OK] Filtros combinados 
- [OK] Búsqueda + filtro simultáneo 
- [OK] Reset de filtros 

## Paginación
- [OK] Navegar entre páginas 
- [OK] Paginación con filtros activos 

---

# Charter 4 – MovieInfo
## Carga y estados
- [OK] Renderiza datos correctos 


## Rating del usuario
- [OK] Usuario NO logueado → botón “Rate” visible 
- [OK] Usuario logueado → botón “Change rating” visible 
- [OK] Borrar rating 
- [OK] Borrar comentario 

---

# Charter 5 – RateMovie
## Carga inicial
- [OK] Sin token → redirige a /login 
- [OK] Con token → carga el rating previo 
- [BUG] Rating no existente (404) respeta valores por defecto 
- [BUG] Si en la pantalla de rating voy a una pelicula inexistente no sale el 404, sale cuando le doy a Submit

## Envío de rating
- [OK] Enviar rating nuevo 
- [OK] Editar rating existente 
- [OK] Enviar sin comentario 
- [OK] El comentario se borra correctamente 
- [OK] Validaciones 0–10 

---

# Charter 6 – Navegación general / UX
## Navegación
- [OK] Enlaces del header 
- [OK] Botón Home / Back 
- [OK] Navegar con historial del navegador 
- [OK] Rutas inexistentes (404) 