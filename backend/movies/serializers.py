from rest_framework import serializers
from .models import Movie
from django.db.models import Avg

class MovieSerializer(serializers.ModelSerializer):
    rating = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Movie
        # Especificamos los campos que queremos en la respuesta JSON
        fields = ['id', 'title', 'image', 'rating']

    def get_rating(self, obj):
        # Calculamos la media de las puntuaciones ('score') de todas las valoraciones ('ratings') asociadas.
        average = obj.ratings.aggregate(Avg('score')).get('score__avg')

        if average is None:
            return 0
        return round(average, 1) # Redondeamos a un decimal