# backend/movies/models.py

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Avg


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
        agg = self.ratings.aggregate(avg_score=Avg('score'))
        avg_local = agg.get('avg_score')
        imdb = getattr(self, 'imdb_rating', None) or 0.0

        # If no local ratings, return imdb rating (if present)
        if not avg_local:
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


class Rating(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    score = models.IntegerField()

    def __str__(self):
        return f'{self.movie} - {self.user.username}: {self.score}'