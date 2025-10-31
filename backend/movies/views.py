from django.shortcuts import render
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Movie
from .serializers import UserLoginSerializer, MovieSerializer
from django.db.models import Avg
from rest_framework_simplejwt.tokens import RefreshToken


class UserLoginAPIView(APIView):
    """
    API View para autenticar un usuario.
    """
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token)
        })


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
    lookup_field = 'tconst'  # Le decimos a DRF que use 'tconst' para buscar en lugar del ID