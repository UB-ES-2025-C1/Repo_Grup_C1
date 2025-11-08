from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model


User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Permite autenticar con email y contraseña en vez de username.
    """
    def authenticate(self, request, username=None, password=None, email=None, **kwargs):
        email = email or username
        if email is None or password is None:
            return None
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return None
        if user.check_password(password):
            return user
        return None