# locustfile1.py
import random
import time # Importamos time para poder añadir pausas si es necesario
from locust import HttpUser, task, between, events


BASE_URL = "http://127.0.0.1:8000"

# Un contador simple para generar emails únicos
user_counter = 0

# Función para generar emails únicos
def get_unique_email():
    global user_counter
    user_counter += 1
    return f"locust_user_{user_counter}_{int(time.time())}@example.com"


class AuthenticatedUser(HttpUser):
    host = BASE_URL
    wait_time = between(1, 5) # Los usuarios esperan entre 1 y 5 segundos entre tareas

    known_movie_tconsts = [
        "tt0050083", "tt0137523", "tt0109830", "tt1375666", "tt0816692",
        "tt26439764", "tt34365591", "tt5354160", "tt0110912", "tt0108052"
    ]
    movie_to_rate_tconst = "tt0137523" # Asegúrate de que esta película exista en tu DB

    # Variables para almacenar tokens
    access_token = None
    refresh_token = None
    
    # Se ejecuta una vez por cada usuario virtual al inicio
    def on_start(self):
        self.email = get_unique_email()
        self.password = "Secret12345" # Contraseña que cumple las validaciones de tu serializador

        self.register_and_login()
        # Inicializamos el encabezado de autorización una vez
        if self.access_token:
            self.client.headers = {"Authorization": f"Bearer {self.access_token}"}
        else:
            # Si no se pudo autenticar, este usuario virtual no puede continuar con tareas protegidas
            print(f"[{self.email}] ERROR: No se pudo obtener el token de acceso. Deteniendo usuario.")
            self.environment.runner.quit() # O podrías optar por solo detener este usuario: self.stop()

    def register_and_login(self):
        """
        Intenta registrar un nuevo usuario y luego inicia sesión para obtener tokens.
        """
        # 1. Intentar registrar al usuario
        register_payload = {
            "username": self.email.split('@')[0], # Usar el email como base para username
            "email": self.email,
            "password": self.password
        }
        with self.client.post("/movies/register/", json=register_payload, name="/movies/register/", catch_response=True) as response:
            if response.status_code == 201:
                response.success()
                # print(f"[{self.email}] Registro exitoso.")
            elif response.status_code == 400 and "ya está en uso" in response.text:
                response.success() # El usuario ya existe, no es un fallo para el escenario de prueba
                # print(f"[{self.email}] Usuario ya existe, continuando con login.")
            else:
                response.failure(f"[{self.email}] Fallo al registrar usuario: {response.text}")
                return # No continuar con el login si el registro crítico falló

        # 2. Iniciar sesión para obtener el token JWT
        login_payload = {
            "email": self.email,
            "password": self.password
        }
        with self.client.post("/movies/login/", json=login_payload, name="/movies/login/", catch_response=True) as response:
            if response.status_code == 200:
                self.access_token = response.json()['access']
                self.refresh_token = response.json()['refresh']
                response.success()
                # print(f"[{self.email}] Login exitoso. Tokens obtenidos.")
            else:
                response.failure(f"[{self.email}] Fallo al iniciar sesión: {response.text}")
                self.access_token = None # Asegurarnos de que no hay token
                self.refresh_token = None
    
    @task(3) # Esta tarea se ejecutará con más frecuencia
    def view_movies_list(self):
        self.client.get("/movies/", name="/movies/list/")

    @task(2)
    def view_movie_detail(self):
        if self.known_movie_tconsts:
            tconst = random.choice(self.known_movie_tconsts)
            self.client.get(f"/movies/{tconst}/", name="/movies/[tconst]/detail")
        else:
            print("No known movie tconsts to view details.")

    @task(1) # Esta tarea se ejecutará menos frecuentemente
    def refresh_access_token(self):
        """
        Simula la renovación del token de acceso usando el token de refresco.
        Esto se ejecutará aleatoriamente como cualquier otra tarea.
        En un caso real, podrías querer invocarlo solo cuando el token de acceso expire.
        """
        if self.refresh_token:
            payload = {"refresh": self.refresh_token}
            with self.client.post("/movies/token/refresh/", json=payload, name="/movies/token/refresh/", catch_response=True) as response:
                if response.status_code == 200:
                    self.access_token = response.json()['access']
                    self.client.headers["Authorization"] = f"Bearer {self.access_token}"
                    response.success()
                    # print(f"[{self.email}] Token de acceso renovado exitosamente.")
                else:
                    response.failure(f"[{self.email}] Fallo al refrescar token: {response.text}")
                    # Si el refresco falla (ej. token de refresco caducado o inválido),
                    # el usuario debe intentar iniciar sesión de nuevo o detenerse.
                    print(f"[{self.email}] Fallo al refrescar token. Intentando re-login...")
                    self.register_and_login() # Intentar re-autenticar
                    if not self.access_token: # Si el re-login también falla, detener este usuario
                        self.environment.runner.quit()
        else:
            print(f"[{self.email}] No hay token de refresco para renovar.")


    @task(1)
    def rate_movie(self):
        """
        Simula un usuario calificando o actualizando una película.
        """
        if not self.access_token:
            print(f"[{self.email}] No autenticado para calificar película. Re-autenticando...")
            self.register_and_login() # Intentar re-autenticar
            if not self.access_token:
                print(f"[{self.email}] Fallo en re-autenticación. No se puede calificar.")
                return

        if self.movie_to_rate_tconst:
            rating_payload = {
                "movie": self.movie_to_rate_tconst,
                "overall_score": random.randint(1, 10),
                "soundtrack": random.randint(1, 10),
                "acting": random.randint(1, 10),
                "cinematography": random.randint(1, 10),
                "plot": random.randint(1, 10),
                "comment": f"Mi comentario de prueba para {self.movie_to_rate_tconst} - {self.email}"
            }
            with self.client.post("/movies/ratings/", json=rating_payload, name="/movies/ratings/", catch_response=True) as response:
                if response.status_code in [200, 201]:
                    response.success()
                else:
                    response.failure(f"[{self.email}] Error al calificar la película {self.movie_to_rate_tconst}: {response.text}")
        else:
            print(f"[{self.email}] No movie tconst configured for rating.")