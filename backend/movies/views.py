from django.shortcuts import render
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Movie, Rating
from .serializers import UserRegisterSerializer, UserLoginSerializer, MovieSerializer, RatingSerializer
from django.db.models import Avg
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import permissions, generics
from .models import Profile
from .serializers import UserProfileSerializer, ProfileUpdateSerializer


class UserRegisterAPIView(generics.CreateAPIView):
    """
    This viewset automatically provides `list` and `retrieve` actions.
    """
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer


class UserLoginAPIView(APIView):
    """
    API View para autenticar un usuario.
    """
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data, context={'request': request})
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
    queryset = Movie.objects.all()
    
class MovieDetailAPIView(generics.RetrieveAPIView):
    """
    API View para ver los detalles de una película específica.
    """

    serializer_class = MovieSerializer
    queryset = Movie.objects.all()
    lookup_field = 'tconst'  # Le decimos a DRF que use 'tconst' para buscar en lugar del ID


class RatingCreateAPIView(generics.CreateAPIView):
    """
    Permite a un usuario autenticado crear o actualizar su Rating para una película.
    """
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # serializer.create() obtiene el user desde request en su contexto, pero
        # para ser explícitos pasamos el request en el contexto (ya viene)
        serializer.save()

    '''
    Ejemplo de payload (frontend) para crear una valoración (rating):

    const payload = {
        movie: "tt0111161", // tconst
        overall_score: 9,
        soundtrack: 8,
        acting: 10,
        cinematography: 9,
        plot: 9,
        comment: "Gran peli"
    };
    axios.post('/api/movies/ratings/', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
    .then(res => console.log(res.data))
    .catch(err => console.error(err.response?.data || err));
    '''


class UserMovieRatingAPIView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve / update / delete the authenticated user's Rating for a given movie tconst."""
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        tconst = self.kwargs.get('tconst')
        user = self.request.user
        try:
            return Rating.objects.get(movie__tconst=tconst, user=user)
        except Rating.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Rating not found for this user and movie')
        
    '''
    Ejemplos de frontend para usar esta vista:
    // GET
    axios.get('/api/movies/ratings/tt0111161/', {
    headers: { Authorization: `Bearer ${accessToken}` }
    }).then(res => console.log(res.data));

    // PUT (actualizar)
    axios.put('/api/movies/ratings/tt0111161/', {
    overall_score: 8,
    soundtrack: 7,
    acting: 9,
    cinematography: 8,
    plot: 8,
    comment: 'Cambio de valoración'
    }, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    }).then(res => console.log(res.data));

    // DELETE
    axios.delete('/api/movies/ratings/tt0111161/', {
    headers: { Authorization: `Bearer ${accessToken}` }
    }).then(res => console.log(res.data));
    '''
class UserProfileDetailAPIView(generics.RetrieveAPIView):
    """
    View to see a user's profile. Publicly accessible.
    """
    queryset = Profile.objects.all().select_related('user') # Optimization to fetch the user in the same query
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.AllowAny] # Important to make it public!
    lookup_field = 'user__username' # We tell DRF to look up by the related user's username

class MyProfileAPIView(generics.RetrieveUpdateAPIView):
    """
    Allows the authenticated user to view and update their own profile.
    """
    permission_classes = [permissions.IsAuthenticated] # Only authenticated users

    def get_object(self):
        """
        We override this method to always return the profile
        of the user making the request (request.user).
        """
        # self.request.user is available thanks to IsAuthenticated
        return self.request.user.profile

    def get_serializer_class(self):
        """
        Optional: Use a different serializer for reading vs. writing.
        """
        if self.request.method in ['PUT', 'PATCH']:
            return ProfileUpdateSerializer
        return UserProfileSerializer

    