from django.urls import path
from .views import UserLoginAPIView, MovieListAPIView, MovieDetailAPIView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('login/', UserLoginAPIView.as_view(), name='user-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', MovieListAPIView.as_view(), name='movie-list'),
    path('<str:tconst>/', MovieDetailAPIView.as_view(), name='movie-detail'),
]