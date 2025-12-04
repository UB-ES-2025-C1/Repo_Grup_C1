from django.contrib import admin

from django.contrib import admin
from .models import Movie, Rating, Profile, Comment, CommentLike, Forum, ForumPost

admin.site.register(Movie)
admin.site.register(Rating)
admin.site.register(Profile)
admin.site.register(Comment)
admin.site.register(CommentLike)
admin.site.register(Forum)
admin.site.register(ForumPost)