from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.models import User
from .models import Movie
from django.db.models import Avg


class UserSerializer(serializers.ModelSerializer):
    # El email es obligatorio y único
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    # La contraseña es write only para no permitir su lectura
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class MovieSerializer(serializers.ModelSerializer):
    # Campos personalizados con los nombres que espera el frontend
    primaryTitle = serializers.CharField(source='primary_title')
    startYear = serializers.CharField(source='start_year')
    # description, poster_path and poster_attribution exist on the model and
    # will be included via ModelSerializer fields, so no explicit source needed.

    # Campo calculado para compatibilidad con el frontend
    average_rating = serializers.SerializerMethodField()
    numVotes = serializers.SerializerMethodField()

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
            'imdb_rating',
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

    def get_numVotes(self, obj):
        # Preferimos un campo anotado 'num_votes_count' o la propiedad/campo num_votes
        count = getattr(obj, 'num_votes_count', None)
        if count is not None:
            return count
        if getattr(obj, 'num_votes', None):
            return obj.num_votes
        return obj.ratings.count()