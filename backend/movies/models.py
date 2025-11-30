# backend/movies/models.py

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Avg
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Avg
from django.db.models import Q 


class Movie(models.Model):
    # External identifier (e.g. IMDB tconst)
    tconst = models.CharField(max_length=32, unique=True, null=True, blank=True)

    # Human readable title (kept for compatibility)
    title = models.CharField(max_length=200, null=True, blank=True)

    # Canonical primary title used by the frontend
    primary_title = models.CharField(max_length=200, null=True, blank=True)

    director = models.CharField(max_length=100, null=True, blank=True)
    # Géneros (lista separada por comas). Se deja como CharField simple
    # por ahora; si se necesita búsquedas/relaciones más ricas se puede
    # reemplazar por un modelo ManyToMany (Genre) más adelante.
    genres = models.CharField(max_length=300, null=True, blank=True)

    # Actores principales / reparto. Almacenado como cadena separada por
    # comas para evitar introducir nuevas tablas por el momento.
    actors = models.CharField(max_length=1000, null=True, blank=True)

    # Year as string to allow unknown/partial values
    start_year = models.CharField(max_length=10, null=True, blank=True)

    # Longer description / synopsis
    description = models.TextField(null=True, blank=True)

    # Poster URL or static path (store as string so frontend can use it directly)
    poster_path = models.CharField(max_length=500, null=True, blank=True)
    poster_attribution = models.CharField(max_length=200, null=True, blank=True)

    # Optional local image field (kept for backwards compatibility)
    image = models.ImageField(upload_to='movie_images/', null=True, blank=True)

    # Rating from IMDb
    imdb_rating = models.FloatField(default=0.0)

    def __str__(self):
        return self.primary_title or self.title or self.tconst or super().__str__()

    @property
    def average_rating(self):
        """
        Return average between the external IMDb rating (`imdb_rating`)
        and the local ratings stored in the `Rating` related objects.

        Formula:
            combined = (imdb_rating * 0.5) + (avg_local * 0.5)
        """
        # local average and count
        agg = self.ratings.aggregate(avg_score=Avg('overall_score'))
        avg_local = agg.get('avg_score')
        imdb = getattr(self, 'imdb_rating', None) or 0.0

        # If no local ratings, return imdb rating (if present)
        if avg_local is None:
            return round(imdb, 1) if imdb else 0

        # If imdb rating is not provided (0), return local average
        if not imdb:
            return round(avg_local, 1) if avg_local is not None else 0

        combined = (imdb * 0.5) + (avg_local * 0.5)
        return round(combined, 1)

    @property
    def numVotes(self):
        """Return the count of local ratings for this movie."""
        return self.ratings.count()

    @property
    def average_soundtrack(self):
        """Average soundtrack score (0-10) from related Rating objects."""
        agg = self.ratings.aggregate(avg_soundtrack=Avg('soundtrack'))
        val = agg.get('avg_soundtrack')
        return round(val, 1) if val is not None else 0

    @property
    def average_acting(self):
        """Average acting score (0-10) from related Rating objects."""
        agg = self.ratings.aggregate(avg_acting=Avg('acting'))
        val = agg.get('avg_acting')
        return round(val, 1) if val is not None else 0

    @property
    def average_cinematography(self):
        """Average cinematography score (0-10) from related Rating objects."""
        agg = self.ratings.aggregate(avg_cinematography=Avg('cinematography'))
        val = agg.get('avg_cinematography')
        return round(val, 1) if val is not None else 0

    @property
    def average_plot(self):
        """Average plot score (0-10) from related Rating objects."""
        agg = self.ratings.aggregate(avg_plot=Avg('plot'))
        val = agg.get('avg_plot')
        return round(val, 1) if val is not None else 0


class Rating(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    # Fecha de creación del rating (autoestablecida al crear)
    date = models.DateTimeField(auto_now_add=True)
    # Valoración general (0-10)
    overall_score = models.PositiveSmallIntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(10)])

    # Valoraciones por apartados (0-10)
    soundtrack = models.PositiveSmallIntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(10)])
    acting = models.PositiveSmallIntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(10)])
    cinematography = models.PositiveSmallIntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(10)])
    plot = models.PositiveSmallIntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(10)])

    
    def __str__(self):
        return f'{self.movie} - {self.user.username}: {self.overall_score}'
    

def avatar_upload_path(instance, filename):
    '''
    Devuelve el path donde subir la foto de perfil segun el usuario.
    Solo se permite una foto por usuario, para no colapsar la base de datos.
    '''
    extension = filename.split('.')[-1]
    return f"profile_photos/user_{instance.user.id}.{extension}"


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True, null=True)
    photo = models.ImageField(upload_to=avatar_upload_path, blank=True, null=True)

    @property
    def average_rating(self):
        """
        Calculates the average of all 'overall_score' ratings
        made by this user.
        """
        # We use 'user.rating_set' to access the related ratings
        aggregation = self.user.rating_set.aggregate(average=Avg('overall_score'))
        avg = aggregation.get('average')

        if avg is None:
            return 0
        
        return round(avg, 1)

    def __str__(self):
        return f'{self.user.username} Profile'
    
    def save(self, *args, **kwargs):
        try:
            old = Profile.objects.get(pk=self.pk)
            if old.photo and old.photo != self.photo:
                old.photo.delete(save=False)
        except Profile.DoesNotExist:
            pass

        super().save(*args, **kwargs)

class Comment(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    
    # Si es null, es un comentario raíz (opinión de la peli).
    # Si tiene valor, es una respuesta a otro comentario.
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        
        # AÑADIMOS una restricción condicional:
        # Un usuario solo puede tener UN comentario por película SI parent es NULL (comentario raíz).
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'movie'], 
                condition=Q(parent__isnull=True), 
                name='unique_root_comment_per_user'
            )
        ]

    def __str__(self):
        if self.parent:
            return f'Reply by {self.user.username} to comment {self.parent.id}'
        return f'Comment by {self.user.username} on {self.movie}'
    
class CommentLike(models.Model):
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comment_likes')
    created_at = models.DateTimeField(auto_now_add=True) # <--- La gran ventaja

    class Meta:
        # Un usuario solo puede dar un like por comentario
        constraints = [
            models.UniqueConstraint(fields=['user', 'comment'], name='unique_like_per_user')
        ]
        # Opcional: Para obtener los likes más recientes primero
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} likes comment {self.comment.id}'