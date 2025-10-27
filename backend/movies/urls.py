from django.urls import path
from .views import UserRegisterAPIView, MovieListAPIView, MovieDetailAPIView

urlpatterns = [
    path('register/', UserRegisterAPIView.as_view(), name='user-register'),
    path('', MovieListAPIView.as_view(), name='movie-list'),
    path('<str:tconst>/', MovieDetailAPIView.as_view(), name='movie-detail'),
]