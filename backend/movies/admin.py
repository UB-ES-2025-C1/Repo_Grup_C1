from django.contrib import admin

from django.contrib import admin
from .models import Movie, Rating, Profile, Comment, CommentLike

admin.site.register(Movie)
admin.site.register(Rating)
admin.site.register(Profile)
admin.site.register(Comment)
admin.site.register(CommentLike)