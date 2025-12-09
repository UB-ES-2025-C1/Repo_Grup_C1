# backend/movies/signals.py
from django.db.models.signals import post_save, post_delete
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import Profile, Rating, ForumPost, Comment
from .serializers import MovieSerializer, MovieMiniSerializer, ForumSerializer, ForumPostSerializer, CommentSerializer
from .notify import publish_sse

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()


@receiver(post_save, sender=Rating)
def rating_created(sender, instance, created, **kwargs):
    if not created:
        return

    movie = instance.movie
    user = instance.user

    if not movie or not user:
        return

    movie_serializer = MovieSerializer(movie)
    
    channel = f'movie:{movie.tconst}'
    event = {
        'type': 'new_rating',
        'rating': {
            'id': instance.id,
            'movie_info': MovieMiniSerializer(movie).data,
            'user': {
                'username': user.username,
                'photo': getattr(user.profile, 'photo', None).url if hasattr(user, 'profile') and user.profile.photo else None,
            },
            'overall_score': instance.overall_score,
            'soundtrack': instance.soundtrack,
            'acting': instance.acting,
            'cinematography': instance.cinematography,
            'plot': instance.plot,
            'date': str(instance.date),
        },
        'new_movie': movie_serializer.data,
    }
    publish_sse(channel, event)


@receiver(post_delete, sender=Rating)
def rating_deleted(sender, instance, **kwargs):
    movie = instance.movie
    user = instance.user

    if not movie or not user:
        return
    
    movie_serializer = MovieSerializer(movie)
    
    channel = f'movie:{movie.tconst}'
    event = {
        'type': 'deleted_rating',
        'rating': {
            'id': instance.id,
            'movie_info': { 'tconst': movie.tconst },
            'user': {
                'id': user.id,
                'username': user.username
            }
        },
        'new_movie': movie_serializer.data,
    }
    publish_sse(channel, event)


@receiver(post_save, sender=Comment)
def comment_created(sender, instance, created, **kwargs):
    if not created:
        return

    movie = instance.movie
    user = instance.user

    if not movie or not user:
        return

    comment_serializer = CommentSerializer(instance)
    movie_serializer = MovieMiniSerializer(movie)
    
    channel = f'movie:{movie.tconst}'
    event = {
        'type': 'new_comment',
        'movie_info': movie_serializer.data,
        'comment': comment_serializer.data,
    }
    publish_sse(channel, event)


@receiver(post_delete, sender=Comment)
def comment_deleted(sender, instance, **kwargs):
    movie = instance.movie
    user = instance.user

    if not movie or not user:
        return
    
    movie_serializer = MovieMiniSerializer(movie)
    
    channel = f'movie:{movie.tconst}'
    event = {
        'type': 'deleted_comment',
        'movie_info': movie_serializer.data,
        'comment': {
            'id': instance.id,
            'user': {
                'id': user.id,
                'username': user.username
            }
        },
    }
    publish_sse(channel, event)


@receiver(post_save, sender=ForumPost)
def post_created(sender, instance, created, **kwargs):
    if not created:
        return
    
    forum = instance.forum
    user = instance.user

    if not forum or not user:
        return

    post_serializer = ForumPostSerializer(instance)
    forum_serializer = ForumSerializer(forum)

    channel = f'forum:{instance.forum.id}'
    event = {
        'type': 'new_forum_post',
        'forum_post': post_serializer.data,
        'forum_info': forum_serializer.data,
    }
    publish_sse(channel, event)