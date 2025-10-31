from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.core.validators import RegexValidator
from django.contrib.auth.models import User
from .models import Movie
from django.db.models import Avg


class UserRegisterSerializer(serializers.ModelSerializer):
    # El usuario es obligatorio, único y no puede estar vacío
    username = serializers.CharField(
        required=True,
        error_messages={
            'required': "El nom d'usuari és obligatori.",
            'blank': "El nom d'usuari no pot estar buit."
        },
        validators=[
            UniqueValidator(queryset=User.objects.all(),
                            message="El nom d'usuari ja està en ús.")
        ]
    )

    # El email es obligatorio, único y tiene que estar en un formato correcto
    email = serializers.EmailField(
        required=True,
        error_messages={
            'required': 'El correu electrònic és obligatori.',
            'blank': 'El correu electrònic no pot estar buit.',
            'invalid': 'El correu electrònic no té un format vàlid.'
        },
        validators=[
            UniqueValidator(queryset=User.objects.all(),
                            message='El correu electrònic ja està en ús.')
        ]
    )

    # La contraseña es write only y se valida que sea válida con regex
    # Tiene que tener entre 8 y 30 carácteres y contener al menos una mayúscula, una minúscula y un número
    password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        max_length=30,
        error_messages={
            'required': 'La contrasenya és obligatòria.',
            'min_length': 'La contrasenya ha de tenir al menys 8 caràcters.',
            'max_length': 'La contrasenya no pot tenir més de 30 caràcters.'
        },
        validators=[
            RegexValidator(
                regex=r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,30}$',
                message='La contrasenya ha de tenir entre 8 i 30 caràcters i contenir almenys una majúscula, una minúscula i un número.'
            )
        ])

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


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