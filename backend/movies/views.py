from django.shortcuts import render
from rest_framework import generics
from .models import Movie
from .serializers import MovieSerializer
from django.db.models import Avg

class MovieListAPIView(generics.ListAPIView):
    """
    API View para listar todas las películas.
    """
    serializer_class = MovieSerializer

    def get_queryset(self):
        """
        Sobrescribimos el método para anotar el rating promedio en cada película.
        Esto es más eficiente que calcularlo en el serializer para cada película por separado.
        """
        return Movie.objects.annotate(
            avg_rating=Avg('ratings__score')
        ).order_by('-avg_rating')