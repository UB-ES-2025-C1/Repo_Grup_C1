# backend/movies/migrations/0013_migrate_comments_data.py
from django.db import migrations

def move_comments(apps, schema_editor):
    Rating = apps.get_model('movies', 'Rating')
    Comment = apps.get_model('movies', 'Comment')
    
    # Obtenemos todos los ratings que tengan comentario
    ratings_with_comments = Rating.objects.exclude(comment__isnull=True).exclude(comment__exact='')

    for rating in ratings_with_comments:
        # Verificar si ya existe un comentario para evitar error de duplicados
        if not Comment.objects.filter(user=rating.user, movie=rating.movie).exists():
            Comment.objects.create(
                user=rating.user,
                movie=rating.movie,
                text=rating.comment,
                created_at=rating.date, # Preservamos la fecha original
                updated_at=rating.date
            )

class Migration(migrations.Migration):

    dependencies = [
        # Asegúrate de que esto apunta a la migración anterior (la que creó la tabla Comment)
        ('movies', '0012_comment'), 
    ]

    operations = [
        migrations.RunPython(move_comments),
    ]