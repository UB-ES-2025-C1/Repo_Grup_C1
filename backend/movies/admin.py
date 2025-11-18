from django.contrib import admin

from django.contrib import admin
from .models import Movie, Rating, Profile

admin.site.register(Movie)
admin.site.register(Rating)
admin.site.register(Profile)