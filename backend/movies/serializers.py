from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.core.validators import RegexValidator
from django.contrib.auth.models import User
from .models import Movie
from django.db.models import Avg
from django.contrib.auth import authenticate
from .models import Rating
from rest_framework.exceptions import ValidationError
from axes.handlers.database import AxesDatabaseHandler
from .models import Profile
    

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
                regex=r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)',
                message='La contrasenya ha de contenir almenys una majúscula, una minúscula i un número.'
            )
        ])

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
    

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data['email']
        password = data['password']
        request = self.context.get('request')
        axes_handler = AxesDatabaseHandler()

        user = authenticate(request=request, username=email, password=password)

        # Auteticación bloqueada por numero de intentos fallidos alcanzado
        if axes_handler.is_locked(request, credentials={'username': email}):
            raise serializers.ValidationError({'detail': 
                                               "Has superat el nombre màxim d'intents. Torna-ho a provar en 30 minuts."})

        # Autenticación fallida por credenciales incorrectas
        if not user:
            raise serializers.ValidationError({'detail': 'Correu electrònic o contrasenya incorrectes.'})
        
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
        avg_local = obj.ratings.aggregate(Avg('overall_score')).get('overall_score__avg')
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


class RatingSerializer(serializers.ModelSerializer):
    # Accept movie tconst in input (write-only). We look up the Movie in create().
    movie = serializers.CharField(write_only=True)
    # Expose movie.tconst on reads
    movie_tconst = serializers.CharField(source='movie.tconst', read_only=True)

    class Meta:
        model = Rating
        fields = [
            'id',
            'movie',
            'movie_tconst',
            'overall_score',
            'soundtrack',
            'acting',
            'cinematography',
            'plot',
            'comment',
        ]

    def validate_overall_score(self, value):
        if value < 0 or value > 10:
            raise ValidationError('overall_score must be between 0 and 10')
        return value

    def validate(self, data):
        # Ensure movie exists by tconst
        tconst = data.get('movie')
        try:
            movie = Movie.objects.get(tconst=tconst)
        except Movie.DoesNotExist:
            raise ValidationError({'movie': 'Movie with provided tconst does not exist.'})
        data['movie_obj'] = movie
        return data

    def create(self, validated_data):
        # movie_obj populated in validate()
        movie = validated_data.pop('movie_obj')
        # remove raw 'movie' key (tconst string) if present to avoid passing it to model create
        validated_data.pop('movie', None)
        # request user
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            raise ValidationError({'detail': 'Authentication required.'})

        # Prevent duplicate rating by same user for same movie
        existing = Rating.objects.filter(movie=movie, user=user).first()
        if existing:
            # Update only known fields on existing rating instead of creating a duplicate
            updatable = ['overall_score', 'soundtrack', 'acting', 'cinematography', 'plot', 'comment']
            for attr in updatable:
                if attr in validated_data:
                    setattr(existing, attr, validated_data[attr])
            existing.save()
            return existing

        rating = Rating.objects.create(movie=movie, user=user, **validated_data)
        return rating

class UserProfileSerializer(serializers.ModelSerializer):
    # Get the username from the related User model
    username = serializers.CharField(source='user.username', read_only=True)
    
    # The 'average_rating' field comes from the Profile model's property
    average_rating = serializers.FloatField(read_only=True)

    class Meta:
        model = Profile
        fields = ['username', 'bio', 'photo', 'average_rating']

class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        # We only include the fields that the user can edit
        fields = ['bio', 'photo']