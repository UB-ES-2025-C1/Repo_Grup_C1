from django.shortcuts import render, get_object_or_404
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Movie, Rating
from .serializers import UserRegisterSerializer, UserLoginSerializer, MovieSerializer, RatingSerializer
from django.db.models import Avg
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import permissions, generics
from .models import Profile, Comment
from .serializers import UserProfileSerializer, ProfileUpdateSerializer, CommentSerializer
from rest_framework.decorators import api_view
from rest_framework import status
from django.db.models import Count
from .models import CommentLike
from .models import Forum, ForumPost
from .serializers import ForumSerializer, ForumPostSerializer
from django.db.models import Count 



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

# Add this new view at the end
class UserRatingsListAPIView(generics.ListAPIView):
    """
    Provides a public, read-only list of all ratings made by a specific user.
    """
    serializer_class = RatingSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        """
        This view should return a list of all the ratings for the
        user as determined by the username portion of the URL.
        """
        # Get the username from the URL kwargs
        username = self.kwargs['user__username']
        # Find the user, or return a 404 if they don't exist
        user = get_object_or_404(User, username=username)
        # Filter the ratings queryset to only include ratings from that user
        return Rating.objects.filter(user=user).select_related('movie').order_by('-id') # Order by most recent


class MovieRatingsListAPIView(generics.ListAPIView):
    """
    Public list of ratings for a given movie (tconst), ordered by newest first.
    Excludes the authenticated user's rating (so the frontend can show the user's preview separately).
    """
    serializer_class = RatingSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        tconst = self.kwargs.get('tconst')
        qs = Rating.objects.filter(movie__tconst=tconst).select_related('user', 'movie')
        # Exclude the requesting user's rating if authenticated
        user = getattr(self.request, 'user', None)
        try:
            if user and user.is_authenticated:
                qs = qs.exclude(user=user)
        except Exception:
            # In case request.user is not usable, skip exclusion
            pass
        # Order by date descending (newest first). Fall back to id desc if date missing.
        return qs.order_by('-date', '-id')

@api_view(["GET"])
def get_all_users(request):
    """
    Retorna todos los perfiles con su usuario asociado.
    Filtra por username si se pasa ?q=texto
    """
    query = request.GET.get("q", "").strip()
    
    if query:
        profiles = Profile.objects.select_related("user").filter(user__username__icontains=query)
    else:
        profiles = Profile.objects.select_related("user").all()
    
    serializer = UserProfileSerializer(profiles, many=True)
    return Response(serializer.data)

class MovieCommentsListAPIView(generics.ListAPIView):
    """
    Lista los comentarios RAÍZ.
    ORDEN: Primero los que tienen más likes, luego los más recientes.
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        tconst = self.kwargs.get('tconst')
        return Comment.objects.filter(
            movie__tconst=tconst, 
            parent__isnull=True
        ).select_related('user', 'user__profile').prefetch_related('likes').annotate(
            reply_count=Count('replies', distinct=True),
            like_count=Count('likes', distinct=True) # Contamos likes
        ).order_by('-like_count', 'created_at') # <--- ORDEN ASCENDENTE POR LIKES


class CommentRepliesListAPIView(generics.ListAPIView):
    """
    Lista las respuestas.
    ORDEN: Cronológico (Ascendente), los likes no afectan al orden aquí.
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        comment_id = self.kwargs.get('comment_id')
        return Comment.objects.filter(
            parent__id=comment_id
        ).select_related('user', 'user__profile').prefetch_related('likes').annotate(
            reply_count=Count('replies', distinct=True),
            like_count=Count('likes', distinct=True)
        ).order_by('created_at') # <--- ORDEN CRONOLÓGICO ASCENDENTE


class CommentLikeToggleAPIView(APIView):
    """
    Permite dar o quitar like a un comentario.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, comment_id):
        comment = get_object_or_404(Comment, pk=comment_id)
        user = request.user

        if user in comment.likes.all():
            comment.likes.remove(user)
            liked = False
        else:
            comment.likes.add(user)
            liked = True
            
        return Response({
            'liked': liked, 
            'like_count': comment.likes.count()
        }, status=status.HTTP_200_OK)


class UserMovieCommentAPIView(generics.RetrieveUpdateDestroyAPIView, generics.CreateAPIView):
    """
    Gestiona comentarios.
    - Si se llama con GET/PATCH/DELETE a .../comments/ttXXXX/: Gestiona TU comentario RAÍZ de esa peli.
    - Si se llama con POST: Permite crear comentarios raíz O respuestas.
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Obtiene TU comentario principal sobre la película (no respuestas)
        tconst = self.kwargs.get('tconst')
        user = self.request.user
        movie = get_object_or_404(Movie, tconst=tconst)
        
        # Buscamos solo el comentario raíz (parent=None)
        obj = get_object_or_404(Comment, movie=movie, user=user, parent__isnull=True)
        self.check_object_permissions(self.request, obj)
        return obj

    def create(self, request, *args, **kwargs):
        tconst = self.kwargs.get('tconst')
        movie = get_object_or_404(Movie, tconst=tconst)
        
        # Verificamos si envían parent_id (es una respuesta)
        parent_id = request.data.get('parent_id')

        if not parent_id:
            # Es un comentario raíz. Verificamos si ya existe uno (UniqueConstraint lo pararía, pero mejor avisar antes).
            if Comment.objects.filter(movie=movie, user=request.user, parent__isnull=True).exists():
                return Response(
                    {"detail": "Ya has comentado esta película. Usa PATCH para editar tu reseña principal."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        data = request.data.copy()
        data['movie_tconst'] = tconst
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class CommentLikeToggleAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, comment_id):
        comment = get_object_or_404(Comment, pk=comment_id)
        user = request.user

        # Buscamos si ya existe el like
        existing_like = CommentLike.objects.filter(comment=comment, user=user).first()

        if existing_like:
            # Si existe, lo borramos (Quitar Like)
            existing_like.delete()
            liked = False
        else:
            # Si no existe, lo creamos (Dar Like)
            CommentLike.objects.create(comment=comment, user=user)
            liked = True
            
        # Contamos usando el related_name 'likes'
        return Response({
            'liked': liked, 
            'like_count': comment.likes.count()
        }, status=status.HTTP_200_OK)
    
class ForumListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: Lista todos los foros (Público).
    POST: Crea un nuevo foro (Solo Logueados).
    """
    serializer_class = ForumSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # 1. annotate(num_posts=Count('posts')): Crea un campo temporal 'num_posts'
        # 2. order_by('-num_posts'): Ordena descendente (el que más tiene va primero)
        return Forum.objects.annotate(
            num_posts=Count('posts')
        ).order_by('-num_posts')

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class ForumDetailAPIView(generics.RetrieveAPIView):
    """
    GET: Ver detalles de un foro específico.
    """
    queryset = Forum.objects.all()
    serializer_class = ForumSerializer
    permission_classes = [permissions.AllowAny]

class ForumPostListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: Lista los posts de un foro (Ordenados por antigüedad).
    POST: Crea un post en el foro (Solo Logueados).
    """
    serializer_class = ForumPostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        forum_id = self.kwargs.get('forum_id')
        # El orden ya viene definido en el modelo Meta (['created_at'])
        return ForumPost.objects.filter(forum__id=forum_id).select_related('user', 'user__profile')

    def perform_create(self, serializer):
        forum_id = self.kwargs.get('forum_id')
        forum = get_object_or_404(Forum, pk=forum_id)
        
        # Guardamos el post y actualizamos la fecha del foro para que suba en la lista
        serializer.save(user=self.request.user, forum=forum)
        
        # Opcional: Actualizar el 'updated_at' del foro para indicar actividad reciente
        forum.save()