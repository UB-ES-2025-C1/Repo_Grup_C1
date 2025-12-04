from django.urls import path
from .views import UserRegisterAPIView, UserLoginAPIView, MovieListAPIView, MovieDetailAPIView, RatingCreateAPIView, UserMovieRatingAPIView, UserProfileDetailAPIView
from rest_framework_simplejwt.views import TokenRefreshView


from .views import (
    UserRegisterAPIView, UserLoginAPIView, MovieListAPIView, 
    MovieDetailAPIView, RatingCreateAPIView, UserMovieRatingAPIView,
    UserProfileDetailAPIView, MyProfileAPIView, UserRatingsListAPIView, MovieRatingsListAPIView,get_all_users,
    MovieCommentsListAPIView,  UserMovieCommentAPIView, CommentRepliesListAPIView, CommentLikeToggleAPIView, ForumListCreateAPIView, ForumDetailAPIView, ForumPostListCreateAPIView
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
     # Rutas estáticas y específicas PRIMERO
    path('register/', UserRegisterAPIView.as_view(), name='user-register'),
    path('login/', UserLoginAPIView.as_view(), name='user-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profiles/me/', MyProfileAPIView.as_view(), name='my-profile'),
    path('profiles/<str:user__username>/ratings/', UserRatingsListAPIView.as_view(), name='user-ratings-list'),
    path('profiles/<str:user__username>/', UserProfileDetailAPIView.as_view(), name='user-profile-detail'),
    path('users/', get_all_users, name='get_all_users'),
    
    # --- RUTAS DE FORUMS (Colócalas aquí, ANTES de las rutas dinámicas de películas) ---
    path('forums/', ForumListCreateAPIView.as_view(), name='forum-list'),
    path('forums/<int:pk>/', ForumDetailAPIView.as_view(), name='forum-detail'),
    path('forums/<int:forum_id>/posts/', ForumPostListCreateAPIView.as_view(), name='forum-posts'),
    # -----------------------------------------------------------------------------------

    path('', MovieListAPIView.as_view(), name='movie-list'),
    path('ratings/', RatingCreateAPIView.as_view(), name='rating-create'),
    path('ratings/<str:tconst>/', UserMovieRatingAPIView.as_view(), name='rating-user-movie'),
    
    path('comments/<int:comment_id>/replies/', CommentRepliesListAPIView.as_view(), name='comment-replies-list'),
    path('comments/<int:comment_id>/like/', CommentLikeToggleAPIView.as_view(), name='comment-like-toggle'),
    path('comments/<str:tconst>/', UserMovieCommentAPIView.as_view(), name='user-movie-comment'),
    
    # Rutas dinámicas 'catch-all' (que capturan cualquier string) AL FINAL
    path('<str:tconst>/ratings/', MovieRatingsListAPIView.as_view(), name='movie-ratings-list'),
    path('<str:tconst>/comments/', MovieCommentsListAPIView.as_view(), name='movie-comments-list'),
    path('<str:tconst>/', MovieDetailAPIView.as_view(), name='movie-detail'), 
]