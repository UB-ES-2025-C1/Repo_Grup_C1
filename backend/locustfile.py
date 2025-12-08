# locustfile1.py
import random
import time # Importamos time para poder añadir pausas si es necesario
from locust import HttpUser, task, between, events


BASE_URL = "http://127.0.0.1:8000"

# Un contador simple para generar emails únicos
user_counter = 0

# Listas compartidas para almacenar IDs conocidos (accesibles por todos los usuarios virtuales)
known_forum_ids = []
known_usernames = []
known_comment_ids = []

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
    
    # Variables de estado adicionales
    username = None
    created_forum_ids = []
    created_comment_ids = []
    
    # Se ejecuta una vez por cada usuario virtual al inicio
    def on_start(self):
        self.email = get_unique_email()
        self.password = "Secret12345" # Contraseña que cumple las validaciones de tu serializador
        
        # Inicializar listas de estado
        self.created_forum_ids = []
        self.created_comment_ids = []

        self.register_and_login()
        # Inicializamos el encabezado de autorización una vez
        if self.access_token:
            self.client.headers = {"Authorization": f"Bearer {self.access_token}"}
            # Guardar username después del login
            self.username = self.email.split('@')[0]
            
            # Poblar listas compartidas con llamadas iniciales
            self._populate_known_data()
        else:
            # Si no se pudo autenticar, este usuario virtual no puede continuar con tareas protegidas
            print(f"[{self.email}] ERROR: No se pudo obtener el token de acceso. Deteniendo usuario.")
            self.environment.runner.quit() # O podrías optar por solo detener este usuario: self.stop()
    
    def _populate_known_data(self):
        """Pobla las listas compartidas de datos conocidos."""
        global known_usernames, known_forum_ids
        
        # Obtener lista de usuarios
        try:
            with self.client.get("/movies/users/", name="/movies/users/", catch_response=True) as response:
                if response.status_code == 200:
                    users_data = response.json()
                    if users_data:
                        known_usernames.extend([user.get('username') for user in users_data if user.get('username')])
                        # Eliminar duplicados manteniendo el orden
                        known_usernames = list(dict.fromkeys(known_usernames))
        except Exception:
            pass
        
        # Obtener lista de foros
        try:
            with self.client.get("/movies/forums/", name="/movies/forums/", catch_response=True) as response:
                if response.status_code == 200:
                    forums_data = response.json()
                    if forums_data:
                        known_forum_ids.extend([forum.get('id') for forum in forums_data if forum.get('id')])
                        # Eliminar duplicados manteniendo el orden
                        known_forum_ids = list(dict.fromkeys(known_forum_ids))
        except Exception:
            pass

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
                self.username = register_payload["username"]  # Guardar username
                response.success()
                # print(f"[{self.email}] Login exitoso. Tokens obtenidos.")
            else:
                response.failure(f"[{self.email}] Fallo al iniciar sesión: {response.text}")
                self.access_token = None # Asegurarnos de que no hay token
                self.refresh_token = None
    
    # Métodos auxiliares
    def ensure_authentication(self):
        """Verifica y re-autentica si es necesario."""
        if not self.access_token:
            self.register_and_login()
            if self.access_token:
                self.client.headers = {"Authorization": f"Bearer {self.access_token}"}
            return self.access_token is not None
        return True
    
    def get_random_tconst(self):
        """Obtiene un tconst aleatorio de la lista conocida."""
        if self.known_movie_tconsts:
            return random.choice(self.known_movie_tconsts)
        return None
    
    def get_random_forum_id(self):
        """Obtiene un forum_id aleatorio de la lista conocida."""
        global known_forum_ids
        if known_forum_ids:
            return random.choice(known_forum_ids)
        return None
    
    def get_random_comment_id(self):
        """Obtiene un comment_id aleatorio de la lista conocida."""
        global known_comment_ids
        if known_comment_ids:
            return random.choice(known_comment_ids)
        return None
    
    def get_random_username(self):
        """Obtiene un username aleatorio de la lista conocida."""
        global known_usernames
        if known_usernames:
            return random.choice(known_usernames)
        return self.username  # Fallback al propio username
    
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
        if not self.ensure_authentication():
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
    
    # Tareas de Perfiles
    @task(2)
    def view_my_profile(self):
        """Ver perfil propio."""
        if not self.ensure_authentication():
            return
        with self.client.get("/movies/profiles/me/", name="/movies/profiles/me/", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"[{self.email}] Error al ver perfil propio: {response.text}")
    
    @task(1)
    def update_my_profile(self):
        """Actualizar perfil propio."""
        if not self.ensure_authentication():
            return
        bio_texts = [
            "Apasionado del cine clásico",
            "Fan de las películas de ciencia ficción",
            "Crítico de cine amateur",
            "Amante del séptimo arte",
            f"Usuario de prueba desde {int(time.time())}"
        ]
        update_payload = {
            "bio": random.choice(bio_texts)
        }
        with self.client.patch("/movies/profiles/me/", json=update_payload, name="/movies/profiles/me/", catch_response=True) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"[{self.email}] Error al actualizar perfil: {response.text}")
    
    @task(2)
    def view_user_profile(self):
        """Ver perfil de otro usuario."""
        username = self.get_random_username()
        if username:
            with self.client.get(f"/movies/profiles/{username}/", name="/movies/profiles/[username]/", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                elif response.status_code == 404:
                    response.success()  # Usuario no encontrado no es un fallo crítico
                else:
                    response.failure(f"[{self.email}] Error al ver perfil de {username}: {response.text}")
    
    @task(1)
    def view_user_ratings(self):
        """Ver calificaciones de un usuario."""
        username = self.get_random_username()
        if username:
            with self.client.get(f"/movies/profiles/{username}/ratings/", name="/movies/profiles/[username]/ratings/", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                elif response.status_code == 404:
                    response.success()  # Usuario no encontrado no es un fallo crítico
                else:
                    response.failure(f"[{self.email}] Error al ver calificaciones de {username}: {response.text}")
    
    @task(1)
    def list_all_users(self):
        """Listar todos los usuarios, con o sin búsqueda."""
        global known_usernames
        # A veces buscar, a veces listar todos
        if random.random() < 0.3 and known_usernames:
            search_term = random.choice(known_usernames)[:3]  # Primeros 3 caracteres
            url = f"/movies/users/?q={search_term}"
            name = "/movies/users/?q=[search]"
        else:
            url = "/movies/users/"
            name = "/movies/users/"
        
        with self.client.get(url, name=name, catch_response=True) as response:
            if response.status_code == 200:
                users_data = response.json()
                # Actualizar lista de usernames conocidos
                if users_data:
                    new_usernames = [user.get('username') for user in users_data if user.get('username')]
                    known_usernames.extend(new_usernames)
                    known_usernames = list(dict.fromkeys(known_usernames))
                response.success()
            else:
                response.failure(f"[{self.email}] Error al listar usuarios: {response.text}")
    
    # Tareas adicionales de Calificaciones
    @task(1)
    def get_my_rating(self):
        """Obtener calificación propia de una película."""
        if not self.ensure_authentication():
            return
        tconst = self.get_random_tconst()
        if tconst:
            with self.client.get(f"/movies/ratings/{tconst}/", name="/movies/ratings/[tconst]/", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                elif response.status_code == 404:
                    response.success()  # No tener calificación no es un fallo
                else:
                    response.failure(f"[{self.email}] Error al obtener calificación: {response.text}")
    
    @task(1)
    def update_or_delete_my_rating(self):
        """Actualizar o eliminar calificación propia."""
        if not self.ensure_authentication():
            return
        tconst = self.get_random_tconst()
        if not tconst:
            return
        
        # Alternar entre actualizar y eliminar
        if random.random() < 0.7:  # 70% actualizar, 30% eliminar
            # Actualizar calificación (PATCH - no incluir "movie" ya que viene en la URL)
            rating_payload = {
                "overall_score": random.randint(1, 10),
                "soundtrack": random.randint(1, 10),
                "acting": random.randint(1, 10),
                "cinematography": random.randint(1, 10),
                "plot": random.randint(1, 10),
                "comment": f"Calificación actualizada - {int(time.time())}"
            }
            with self.client.patch(f"/movies/ratings/{tconst}/", json=rating_payload, name="/movies/ratings/[tconst]/PATCH", catch_response=True) as response:
                if response.status_code in [200, 201]:
                    response.success()
                elif response.status_code == 404:
                    response.success()  # No tener calificación previa no es un fallo
                else:
                    response.failure(f"[{self.email}] Error al actualizar calificación: {response.text}")
        else:
            # Eliminar calificación
            with self.client.delete(f"/movies/ratings/{tconst}/", name="/movies/ratings/[tconst]/DELETE", catch_response=True) as response:
                if response.status_code in [200, 204]:
                    response.success()
                elif response.status_code == 404:
                    response.success()  # No tener calificación previa no es un fallo
                else:
                    response.failure(f"[{self.email}] Error al eliminar calificación: {response.text}")
    
    @task(2)
    def view_movie_ratings(self):
        """Ver lista de calificaciones de una película."""
        tconst = self.get_random_tconst()
        if tconst:
            with self.client.get(f"/movies/{tconst}/ratings/", name="/movies/[tconst]/ratings/", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"[{self.email}] Error al ver calificaciones de película: {response.text}")
    
    # Tareas de Comentarios
    @task(3)
    def view_movie_comments(self):
        """Ver comentarios de una película."""
        global known_comment_ids
        tconst = self.get_random_tconst()
        if tconst:
            with self.client.get(f"/movies/{tconst}/comments/", name="/movies/[tconst]/comments/", catch_response=True) as response:
                if response.status_code == 200:
                    comments_data = response.json()
                    # Actualizar lista de comment_ids conocidos
                    if comments_data:
                        new_comment_ids = [comment.get('id') for comment in comments_data if comment.get('id')]
                        known_comment_ids.extend(new_comment_ids)
                        known_comment_ids = list(dict.fromkeys(known_comment_ids))
                    response.success()
                else:
                    response.failure(f"[{self.email}] Error al ver comentarios: {response.text}")
    
    @task(2)
    def create_movie_comment(self):
        """Crear comentario raíz en una película."""
        if not self.ensure_authentication():
            return
        tconst = self.get_random_tconst()
        if tconst:
            comment_texts = [
                "Excelente película, muy recomendable",
                "Me encantó la trama y los personajes",
                "Una obra maestra del cine",
                "Interesante pero esperaba más",
                f"Comentario de prueba {int(time.time())}"
            ]
            comment_payload = {
                "text": random.choice(comment_texts),
                "movie_tconst": tconst
            }
            with self.client.post(f"/movies/comments/{tconst}/", json=comment_payload, name="/movies/comments/[tconst]/POST", catch_response=True) as response:
                if response.status_code in [200, 201]:
                    comment_data = response.json()
                    comment_id = comment_data.get('id')
                    if comment_id:
                        self.created_comment_ids.append(comment_id)
                        global known_comment_ids
                        known_comment_ids.append(comment_id)
                        known_comment_ids = list(dict.fromkeys(known_comment_ids))
                    response.success()
                elif response.status_code == 400 and "Ya has comentado" in response.text:
                    response.success()  # Ya tiene comentario, no es un fallo
                else:
                    response.failure(f"[{self.email}] Error al crear comentario: {response.text}")
    
    @task(2)
    def view_comment_replies(self):
        """Ver respuestas de un comentario."""
        global known_comment_ids
        comment_id = self.get_random_comment_id()
        if comment_id:
            with self.client.get(f"/movies/comments/{comment_id}/replies/", name="/movies/comments/[comment_id]/replies/", catch_response=True) as response:
                if response.status_code == 200:
                    replies_data = response.json()
                    # Actualizar lista de comment_ids conocidos con las respuestas
                    if replies_data:
                        new_comment_ids = [reply.get('id') for reply in replies_data if reply.get('id')]
                        known_comment_ids.extend(new_comment_ids)
                        known_comment_ids = list(dict.fromkeys(known_comment_ids))
                    response.success()
                elif response.status_code == 404:
                    response.success()  # Comentario no encontrado no es un fallo crítico
                else:
                    response.failure(f"[{self.email}] Error al ver respuestas: {response.text}")
    
    @task(1)
    def reply_to_comment(self):
        """Crear respuesta a un comentario."""
        if not self.ensure_authentication():
            return
        global known_comment_ids
        comment_id = self.get_random_comment_id()
        if not comment_id:
            return
        
        # Necesitamos obtener el tconst del comentario, pero como no lo tenemos,
        # usamos un tconst aleatorio. En un caso real, podríamos hacer un GET primero.
        tconst = self.get_random_tconst()
        if tconst:
            reply_texts = [
                "Estoy de acuerdo contigo",
                "Interesante punto de vista",
                "No estoy seguro, pero creo que...",
                "Gracias por compartir tu opinión",
                f"Respuesta {int(time.time())}"
            ]
            reply_payload = {
                "text": random.choice(reply_texts),
                "parent_id": comment_id,
                "movie_tconst": tconst
            }
            with self.client.post(f"/movies/comments/{tconst}/", json=reply_payload, name="/movies/comments/[tconst]/POST_reply", catch_response=True) as response:
                if response.status_code in [200, 201]:
                    reply_data = response.json()
                    reply_id = reply_data.get('id')
                    if reply_id:
                        self.created_comment_ids.append(reply_id)
                        known_comment_ids.append(reply_id)
                        known_comment_ids = list(dict.fromkeys(known_comment_ids))
                    response.success()
                elif response.status_code == 400:
                    response.success()  # Error de validación (ej: respuesta anidada) no es fallo crítico
                else:
                    response.failure(f"[{self.email}] Error al responder comentario: {response.text}")
    
    @task(2)
    def toggle_comment_like(self):
        """Dar o quitar like a un comentario."""
        if not self.ensure_authentication():
            return
        comment_id = self.get_random_comment_id()
        if comment_id:
            with self.client.post(f"/movies/comments/{comment_id}/like/", name="/movies/comments/[comment_id]/like/", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                elif response.status_code == 404:
                    response.success()  # Comentario no encontrado no es un fallo crítico
                else:
                    response.failure(f"[{self.email}] Error al dar like: {response.text}")
    
    @task(1)
    def update_or_delete_my_comment(self):
        """Actualizar o eliminar comentario propio."""
        if not self.ensure_authentication():
            return
        if not self.created_comment_ids:
            return
        
        comment_id = random.choice(self.created_comment_ids)
        # Alternar entre actualizar y eliminar
        if random.random() < 0.7:  # 70% actualizar, 30% eliminar
            # Actualizar comentario
            update_payload = {
                "text": f"Comentario actualizado {int(time.time())}"
            }
            with self.client.patch(f"/movies/comments/{comment_id}/", json=update_payload, name="/movies/comments/[comment_id]/PATCH", catch_response=True) as response:
                if response.status_code in [200, 201]:
                    response.success()
                elif response.status_code == 404:
                    # Comentario ya no existe, remover de la lista
                    if comment_id in self.created_comment_ids:
                        self.created_comment_ids.remove(comment_id)
                    response.success()
                else:
                    response.failure(f"[{self.email}] Error al actualizar comentario: {response.text}")
        else:
            # Eliminar comentario
            with self.client.delete(f"/movies/comments/{comment_id}/", name="/movies/comments/[comment_id]/DELETE", catch_response=True) as response:
                if response.status_code in [200, 204]:
                    # Remover de la lista
                    if comment_id in self.created_comment_ids:
                        self.created_comment_ids.remove(comment_id)
                    response.success()
                elif response.status_code == 404:
                    # Ya no existe, remover de la lista
                    if comment_id in self.created_comment_ids:
                        self.created_comment_ids.remove(comment_id)
                    response.success()
                else:
                    response.failure(f"[{self.email}] Error al eliminar comentario: {response.text}")
    
    # Tareas de Foros
    @task(3)
    def list_forums(self):
        """Listar todos los foros."""
        global known_forum_ids
        with self.client.get("/movies/forums/", name="/movies/forums/", catch_response=True) as response:
            if response.status_code == 200:
                forums_data = response.json()
                # Actualizar lista de forum_ids conocidos
                if forums_data:
                    new_forum_ids = [forum.get('id') for forum in forums_data if forum.get('id')]
                    known_forum_ids.extend(new_forum_ids)
                    known_forum_ids = list(dict.fromkeys(known_forum_ids))
                response.success()
            else:
                response.failure(f"[{self.email}] Error al listar foros: {response.text}")
    
    @task(1)
    def create_forum(self):
        """Crear un nuevo foro."""
        if not self.ensure_authentication():
            return
        forum_titles = [
            "Discusión sobre películas de ciencia ficción",
            "Recomendaciones de cine clásico",
            "Análisis de películas recientes",
            "Debate sobre directores famosos",
            f"Foro de prueba {int(time.time())}"
        ]
        forum_descriptions = [
            "Comparte tus opiniones sobre películas de ciencia ficción",
            "Recomienda y descubre películas clásicas",
            "Analiza las últimas películas estrenadas",
            "Debate sobre los mejores directores",
            f"Descripción del foro {int(time.time())}"
        ]
        forum_payload = {
            "title": random.choice(forum_titles),
            "description": random.choice(forum_descriptions)
        }
        with self.client.post("/movies/forums/", json=forum_payload, name="/movies/forums/POST", catch_response=True) as response:
            if response.status_code in [200, 201]:
                forum_data = response.json()
                forum_id = forum_data.get('id')
                if forum_id:
                    self.created_forum_ids.append(forum_id)
                    global known_forum_ids
                    known_forum_ids.append(forum_id)
                    known_forum_ids = list(dict.fromkeys(known_forum_ids))
                response.success()
            else:
                response.failure(f"[{self.email}] Error al crear foro: {response.text}")
    
    @task(2)
    def view_forum_detail(self):
        """Ver detalle de un foro."""
        forum_id = self.get_random_forum_id()
        if forum_id:
            with self.client.get(f"/movies/forums/{forum_id}/", name="/movies/forums/[pk]/", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                elif response.status_code == 404:
                    # Foro no encontrado, remover de la lista
                    global known_forum_ids
                    if forum_id in known_forum_ids:
                        known_forum_ids.remove(forum_id)
                    response.success()
                else:
                    response.failure(f"[{self.email}] Error al ver foro: {response.text}")
    
    @task(2)
    def list_forum_posts(self):
        """Listar posts de un foro."""
        forum_id = self.get_random_forum_id()
        if forum_id:
            with self.client.get(f"/movies/forums/{forum_id}/posts/", name="/movies/forums/[forum_id]/posts/", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                elif response.status_code == 404:
                    # Foro no encontrado, remover de la lista
                    global known_forum_ids
                    if forum_id in known_forum_ids:
                        known_forum_ids.remove(forum_id)
                    response.success()
                else:
                    response.failure(f"[{self.email}] Error al listar posts: {response.text}")
    
    @task(1)
    def create_forum_post(self):
        """Crear un post en un foro."""
        if not self.ensure_authentication():
            return
        forum_id = self.get_random_forum_id()
        if forum_id:
            post_texts = [
                "Este es un tema muy interesante para debatir",
                "Quería compartir mi opinión sobre este tema",
                "¿Qué piensan ustedes sobre esto?",
                "Excelente foro, gracias por crearlo",
                f"Post de prueba {int(time.time())}"
            ]
            post_payload = {
                "text": random.choice(post_texts)
            }
            with self.client.post(f"/movies/forums/{forum_id}/posts/", json=post_payload, name="/movies/forums/[forum_id]/posts/POST", catch_response=True) as response:
                if response.status_code in [200, 201]:
                    response.success()
                elif response.status_code == 404:
                    # Foro no encontrado, remover de la lista
                    global known_forum_ids
                    if forum_id in known_forum_ids:
                        known_forum_ids.remove(forum_id)
                    response.success()
                else:
                    response.failure(f"[{self.email}] Error al crear post: {response.text}")