from rest_framework import serializers
from .models import Movie
from django.db.models import Avg
from django.contrib.auth import authenticate


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Usuari o contrasenya incorrectes.')
        data['user'] = user
        return data
    

class MovieSerializer(serializers.ModelSerializer):
    # Campos personalizados con los nombres que espera el frontend
    primaryTitle = serializers.CharField(source='primary_title')
    startYear = serializers.CharField(source='start_year')
    # description, poster_path and poster_attribution exist on the model and
    # will be included via ModelSerializer fields, so no explicit source needed.

    # Exponer la calificación de IMDB bajo el nombre esperado por el frontend
    imdbRating = serializers.FloatField(source='imdb_rating')

    # Campo calculado para compatibilidad con el frontend
    average_rating = serializers.SerializerMethodField()
    numVotes = serializers.SerializerMethodField()

    # Exponer géneros y actores como listas (separadas por comas en el modelo)
    genres = serializers.SerializerMethodField()
    actors = serializers.SerializerMethodField()

    class Meta:
        model = Movie
        # Exponer sólo las claves requeridas por el frontend
        fields = [
            'tconst',
            'primaryTitle',
            'startYear',
            'description',
            'poster_path',
            'poster_attribution',
            'imdbRating',
            'director',
            'genres',
            'actors',
            'average_rating',
            'numVotes',
        ]

    def get_average_rating(self, obj):
        # Preferimos una anotación 'avg_rating' (si la vista la provee).
        avg = getattr(obj, 'avg_rating', None)
        if avg is not None:
            return round(avg, 1)

        # Si el modelo tiene la propiedad average_rating (combinada), úsala.
        avg_prop = getattr(obj, 'average_rating', None)
        if avg_prop is not None:
            try:
                return round(float(avg_prop), 1)
            except Exception:
                pass

        # Último recurso: calcular la media local desde ratings relacionados.
        avg_local = obj.ratings.aggregate(Avg('score')).get('score__avg')
        return round(avg_local, 1) if avg_local is not None else 0

    def _split_field(self, value):
        """Helper: convierte una cadena separada por comas en una lista limpia.

        - '' o None -> []
        - 'A, B, C' -> ['A', 'B', 'C'] (trimmed)
        """
        if not value:
            return []
        # split and strip, filter empty
        return [p.strip() for p in str(value).split(',') if p.strip()]

    def get_genres(self, obj):
        # preferir una anotación 'genres' si la vista la provee
        annotated = getattr(obj, 'genres', None)
        # si es None, leer desde el campo del modelo
        raw = annotated if annotated is not None else getattr(obj, 'genres', None)
        return self._split_field(raw)

    def get_actors(self, obj):
        annotated = getattr(obj, 'actors', None)
        raw = annotated if annotated is not None else getattr(obj, 'actors', None)
        return self._split_field(raw)

    def get_numVotes(self, obj):
        # Preferimos un campo anotado 'numVotes'
        count = getattr(obj, 'numVotes', None)
        if count is not None:
            return count
        return 0 if obj.ratings.count() == 0 else obj.ratings.count()