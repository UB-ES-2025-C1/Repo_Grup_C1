# backend/movies/models.py

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Avg

class Movie(models.Model):
    title = models.CharField(max_length=200)
    director = models.CharField(max_length=100)
    release_year = models.IntegerField()
    synopsis = models.TextField()
    image = models.ImageField(upload_to='movie_images/', null=True, blank=True)

    def __str__(self):
        return self.title
    
    @property
    def average_rating(self):
        return self.ratings.aggregate(Avg('score'))['score__avg']

class Rating(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    score = models.IntegerField()

    def __str__(self):
        return f'{self.movie.title} - {self.user.username}: {self.score}'