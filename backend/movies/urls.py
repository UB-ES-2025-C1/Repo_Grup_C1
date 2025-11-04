from django.urls import path
from .views import UserRegisterAPIView, UserLoginAPIView, MovieListAPIView, MovieDetailAPIView, RatingCreateAPIView, UserMovieRatingAPIView
from rest_framework_simplejwt.views import TokenRefreshView


urlpatterns = [
    path('register/', UserRegisterAPIView.as_view(), name='user-register'),
    path('login/', UserLoginAPIView.as_view(), name='user-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', MovieListAPIView.as_view(), name='movie-list'),
    path('<str:tconst>/', MovieDetailAPIView.as_view(), name='movie-detail'),
    path('ratings/', RatingCreateAPIView.as_view(), name='rating-create'),
    path('ratings/<str:tconst>/', UserMovieRatingAPIView.as_view(), name='rating-user-movie'),
]