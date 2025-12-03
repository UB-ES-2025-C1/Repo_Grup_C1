import random
import time
from locust import HttpUser, task, between

BASE_URL = "http://127.0.0.1:8000"

# Contador para emails únicos
user_counter = 0

def get_unique_email():
    global user_counter
    user_counter += 1
    return f"locust_{user_counter}_{int(time.time())}@loadtest.com"

class AuthenticatedUser(HttpUser):
    host = BASE_URL
    # Tiempo de espera entre tareas (simula tiempo de lectura/pensamiento)
    wait_time = between(2, 6)

    # --- DATOS CONOCIDOS O DESCUBIERTOS ---
    # Tconsts iniciales (asegúrate de que existan en tu DB o cárgalos con un fixture)
    known_movie_tconsts = [
        "tt0050083", "tt0137523", "tt0109830", "tt1375666", "tt0816692",
        "tt26439764", "tt34365591", "tt5354160", "tt0110912", "tt0108052"
    ]
    
    # Listas dinámicas para interactuar con contenido creado por otros usuarios
    discovered_forum_ids = []
    discovered_comment_ids = []
    
    access_token = None
    refresh_token = None
    username = None

    def on_start(self):
        """Se ejecuta al arrancar el usuario: Registro y Login."""
        self.email = get_unique_email()
        self.username = self.email.split('@')[0]
        self.password = "Secret123" # Cumple con Mayus, Minus, Numero

        self.register_and_login()
        
        if self.access_token:
            self.client.headers = {"Authorization": f"Bearer {self.access_token}"}
        else:
            self.environment.runner.quit()

    def register_and_login(self):
        # 1. Registro
        reg_payload = {"username": self.username, "email": self.email, "password": self.password}
        with self.client.post("/movies/register/", json=reg_payload, catch_response=True) as response:
            if response.status_code in [201, 400]: 
                # 400 aceptable si el usuario ya existe (reinicios de prueba)
                response.success()
            else:
                response.failure(f"Registro fallido: {response.text}")
                return

        # 2. Login
        login_payload = {"email": self.email, "password": self.password}
        with self.client.post("/movies/login/", json=login_payload, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.access_token = data['access']
                self.refresh_token = data['refresh']
            else:
                response.failure(f"Login fallido: {response.text}")

    # =========================================================================
    # GRUPO 1: NAVEGACIÓN Y PELÍCULAS (Peso alto)
    # =========================================================================

    @task(5)
    def browse_movies(self):
        """Ver lista de películas y entrar al detalle de una."""
        # Ver lista
        self.client.get("/movies/", name="Movies List")
        
        # Ver detalle
        tconst = random.choice(self.known_movie_tconsts)
        self.client.get(f"/movies/{tconst}/", name="Movie Detail")

    @task(2)
    def search_users(self):
        """Buscar otros usuarios."""
        # Búsqueda aleatoria (simulando escribir algo)
        query = random.choice(["a", "mar", "ju", "user", "test"])
        self.client.get(f"/movies/users/?q={query}", name="User Search")

    # =========================================================================
    # GRUPO 2: RATINGS (Valoraciones numéricas)
    # =========================================================================

    @task(3)
    def interact_ratings(self):
        """Calificar una película o ver calificaciones de otros."""
        tconst = random.choice(self.known_movie_tconsts)
        
        action = random.choice(["rate", "view_list", "view_mine"])

        if action == "rate":
            # Crear o actualizar rating (Ratings y Comments ahora separados)
            payload = {
                "movie": tconst,
                "overall_score": random.randint(5, 10), # Somos generosos
                "soundtrack": random.randint(1, 10),
                "acting": random.randint(1, 10),
                "cinematography": random.randint(1, 10),
                "plot": random.randint(1, 10)
            }
            # Nota: El endpoint valida si ya existe y hace update
            self.client.post("/movies/ratings/", json=payload, name="Create/Update Rating")

        elif action == "view_list":
            # Ver ratings de esa peli
            self.client.get(f"/movies/{tconst}/ratings/", name="List Movie Ratings")
        
        elif action == "view_mine":
            # Ver mi propio rating (puede devolver 404 si no he votado, es normal)
            with self.client.get(f"/movies/ratings/{tconst}/", catch_response=True, name="Get My Rating") as resp:
                if resp.status_code == 404:
                    resp.success()

    # =========================================================================
    # GRUPO 3: COMENTARIOS Y LIKES
    # =========================================================================

    @task(4)
    def interact_comments(self):
        """Leer comentarios, comentar (raíz), responder o dar like."""
        tconst = random.choice(self.known_movie_tconsts)

        # 1. Primero leemos los comentarios de la película para "descubrirlos"
        with self.client.get(f"/movies/{tconst}/comments/", catch_response=True, name="List Root Comments") as response:
            if response.status_code == 200:
                comments = response.json()
                if comments:
                    # Guardamos IDs para usarlos en likes o respuestas
                    self.discovered_comment_ids = [c['id'] for c in comments]
                    
                    # A veces leemos las respuestas de un comentario raíz
                    root_id = random.choice(self.discovered_comment_ids)
                    self.client.get(f"/movies/comments/{root_id}/replies/", name="List Replies")

        # 2. Realizamos una acción activa
        dice = random.random()

        if dice < 0.3:
            # Acción A: Crear comentario RAÍZ sobre la película
            payload = {"text": f"Reseña de {self.username} sobre {tconst}. Me gustó mucho."}
            with self.client.post(f"/movies/comments/{tconst}/", json=payload, catch_response=True, name="Post Root Comment") as resp:
                # 400 es aceptable si ya comentamos (restricción Unique)
                if resp.status_code in [201, 400]:
                    resp.success()
                else:
                    resp.failure(f"Error posting comment: {resp.text}")

        elif dice < 0.6 and self.discovered_comment_ids:
            # Acción B: RESPONDER a un comentario existente
            parent_id = random.choice(self.discovered_comment_ids)
            payload = {
                "text": "¡Totalmente de acuerdo contigo!",
                "parent_id": parent_id
            }
            # Usamos el mismo endpoint genérico de creación, pero con parent_id
            self.client.post(f"/movies/comments/{tconst}/", json=payload, name="Post Reply")

        elif self.discovered_comment_ids:
            # Acción C: Dar LIKE a un comentario
            comment_id = random.choice(self.discovered_comment_ids)
            self.client.post(f"/movies/comments/{comment_id}/like/", name="Toggle Like Comment")

    # =========================================================================
    # GRUPO 4: FOROS (Nueva funcionalidad)
    # =========================================================================

    @task(3)
    def interact_forums(self):
        """Leer foros, crear hilos o responder en hilos."""
        
        # 1. Listar Foros (descubrir IDs)
        with self.client.get("/movies/forums/", catch_response=True, name="List Forums") as resp:
            if resp.status_code == 200:
                forums = resp.json()
                self.discovered_forum_ids = [f['id'] for f in forums]

        # 2. Acción
        dice = random.random()

        if dice < 0.2:
            # Crear un NUEVO FORO (menos frecuente)
            payload = {
                "title": f"Debate iniciado por {self.username}",
                "description": "Hablemos de cine clásico y moderno."
            }
            self.client.post("/movies/forums/", json=payload, name="Create Forum")

        elif self.discovered_forum_ids:
            # Entrar a un foro existente
            forum_id = random.choice(self.discovered_forum_ids)
            
            # Ver detalle
            self.client.get(f"/movies/forums/{forum_id}/", name="Forum Detail")
            
            # Ver posts del foro
            self.client.get(f"/movies/forums/{forum_id}/posts/", name="List Forum Posts")

            # Publicar un POST en el foro
            if random.random() < 0.5:
                post_payload = {"text": f"Mi opinión en este foro es importante. {time.time()}"}
                self.client.post(f"/movies/forums/{forum_id}/posts/", json=post_payload, name="Create Forum Post")

    # =========================================================================
    # GRUPO 5: PERFIL
    # =========================================================================

    @task(1)
    def manage_profile(self):
        """Ver y editar perfil propio."""
        # Ver mi perfil
        self.client.get("/movies/profiles/me/", name="Get My Profile")

        # Actualizar Bio (PATCH)
        new_bio = f"Hola, soy {self.username} y me encanta el cine. {int(time.time())}"
        self.client.patch("/movies/profiles/me/", json={"bio": new_bio}, name="Update Bio")

    @task(1)
    def refresh_token_task(self):
        """Renovación del token ocasional."""
        if self.refresh_token:
            self.client.post("/movies/token/refresh/", json={"refresh": self.refresh_token}, name="Token Refresh")