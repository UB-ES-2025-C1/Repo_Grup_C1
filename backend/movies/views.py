from django.shortcuts import render
from rest_framework import generics
from django.contrib.auth.models import User
from .models import Movie
from .serializers import UserRegisterSerializer, MovieSerializer
from django.db.models import Avg


class UserRegisterAPIView(generics.CreateAPIView):
    """
    This viewset automatically provides `list` and `retrieve` actions.
    """
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer


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
    

class MovieDetailAPIView(generics.RetrieveAPIView):
    """
    API View para ver los detalles de una película específica.
    """
    serializer_class = MovieSerializer
    queryset = Movie.objects.all()
    lookup_field = 'tconst'  # Le decimos a DRF que use 'tconst' para buscar en lugar del IDÑ