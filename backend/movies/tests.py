"""
Simple tests for the movies app.
- TestMovieModel: unit tests for Movie.average_rating
- TestRatingAPI: small API tests for creating/updating a Rating via the /movies/ratings/ endpoint
- TestCommentAPI: tests for hierarchical comments (root vs replies)

Run with:
	python manage.py test movies
"""

from unittest.mock import patch
import os

patch.dict(os.environ, {"DISABLE_SSE": "1"}).start()  # Disable redis server for unit tests

from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile

from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from .models import Movie, Rating, Profile, Comment, CommentLike


class TestMovieGetAPI(APITestCase):
    """
	TESTS US1.1.1, US1.1.2 AND US1.2 (Movie get list and detail endpoints)
	"""

    def setUp(self):
        self.client = APIClient()
        # Create several movies
        self.m1 = Movie.objects.create(tconst='tt1001', primary_title='List One', imdb_rating=6.1)
        self.m2 = Movie.objects.create(tconst='tt1002', primary_title='List Two', imdb_rating=7.2)
        # Create a rating for m2 to exercise average and numVotes serialization
        u = User.objects.create_user(username='listuser', email='lu@ex.com', password='pw')
        Rating.objects.create(movie=self.m2, user=u, overall_score=8)

    def test_movie_list_endpoint(self):
        resp = self.client.get('/movies/', format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Expect at least the two movies created
        self.assertIsInstance(resp.data, list)
        # Find the items by tconst
        tconsts = {item.get('tconst') for item in resp.data}
        self.assertIn(self.m1.tconst, tconsts)
        self.assertIn(self.m2.tconst, tconsts)

        # Check that each returned movie contains expected keys
        sample = next((it for it in resp.data if it.get('tconst') == self.m2.tconst), None)
        self.assertIsNotNone(sample)
        for key in ('tconst', 'primaryTitle', 'imdbRating', 'average_rating', 'numVotes'):
            self.assertIn(key, sample)

    def test_movie_detail_endpoint(self):
        # Detail for m2
        resp = self.client.get(f'/movies/{self.m2.tconst}/', format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data
        self.assertEqual(data.get('tconst'), self.m2.tconst)
        self.assertEqual(data.get('primaryTitle'), self.m2.primary_title)
        # numVotes should be 1 because we created a rating
        self.assertEqual(data.get('numVotes'), 1)
        # average_rating should be present and numeric
        self.assertIsInstance(data.get('average_rating'), (int, float))

class TestMovieModel(TestCase):
	"""
	TESTS US1.1.1 AND US1.1.2 (Movie.average_rating property)
	"""
	def setUp(self):
		# Movie with an IMDb rating
		self.movie = Movie.objects.create(
			tconst="tt0000001",
			primary_title="Test Movie",
			imdb_rating=7.4
		)

	def test_average_rating_no_local_ratings_returns_imdb(self):
		# No local ratings -> average_rating == imdb (rounded to 1 decimal)
		self.assertEqual(self.movie.numVotes, 0)
		self.assertEqual(self.movie.average_rating, round(7.4, 1))
		
	def test_average_rating_local_only_when_no_imdb(self):
		# imdb_rating == 0 and local ratings exist -> return local average
		m = Movie.objects.create(tconst="ttLocalOnly", primary_title="LocalOnly", imdb_rating=0)
		u = User.objects.create_user(username='lu', email='lu@example.com', password='p')
		Rating.objects.create(movie=m, user=u, overall_score=7)
		m_ref = Movie.objects.get(pk=m.pk)
		self.assertEqual(m_ref.average_rating, round(7.0, 1))

	def test_average_rating_with_local_ratings_combines_values(self):
		# Create two local ratings with overall_score 8 and 6 -> avg_local = 7
		user1 = User.objects.create_user(username="u1", email="u1@example.com", password="pass")
		user2 = User.objects.create_user(username="u2", email="u2@example.com", password="pass")

		Rating.objects.create(movie=self.movie, user=user1, overall_score=8)
		Rating.objects.create(movie=self.movie, user=user2, overall_score=6)

		# avg_local = 7.0, imdb = 7.4 -> combined = (7.4*0.5) + (7*0.5) = 7.2 -> round(1) -> 7.2
		expected_combined = round((7.4 * 0.5) + (7.0 * 0.5), 1)
		# Re-fetch movie from DB to avoid any caching issues
		m = Movie.objects.get(pk=self.movie.pk)
		self.assertEqual(m.numVotes, 2)
		self.assertEqual(m.average_rating, expected_combined)

class TestMovieAspectAverages(TestCase):
	"""
	TESTS US1.1.2 (per-aspect averages and numVotes calculation on Movie)
	"""
	def setUp(self):
		self.movie = Movie.objects.create(tconst="tt0000003", primary_title="Aspects Movie", imdb_rating=6.0)
		self.movie2 = Movie.objects.create(tconst="tt0000004", primary_title="Aspects Movie 2", imdb_rating=6.0)
		self.u1 = User.objects.create_user(username="a1", email="a1@example.com", password="p")
		self.u2 = User.objects.create_user(username="a2", email="a2@example.com", password="p")
		self.u3 = User.objects.create_user(username="a3", email="a3@example.com", password="p")
		self.u4 = User.objects.create_user(username="a4", email="a4@example.com", password="p")

	def test_aspect_averages_and_numVotes(self):
		# Create three ratings with varied aspect scores
		Rating.objects.create(movie=self.movie, user=self.u1, overall_score=8, soundtrack=7, acting=6, cinematography=9, plot=8)
		Rating.objects.create(movie=self.movie, user=self.u2, overall_score=6, soundtrack=5, acting=7, cinematography=6, plot=7)
		Rating.objects.create(movie=self.movie, user=self.u3, overall_score=9, soundtrack=8, acting=9, cinematography=7, plot=10)

		m = Movie.objects.get(pk=self.movie.pk)
		# numVotes should be 3
		self.assertEqual(m.numVotes, 3)

		# Compute expected averages manually and compare (rounded to 1 decimal by model properties)
		expected_soundtrack = round((7 + 5 + 8) / 3, 1)
		expected_acting = round((6 + 7 + 9) / 3, 1)
		expected_cinematography = round((9 + 6 + 7) / 3, 1)
		expected_plot = round((8 + 7 + 10) / 3, 1)

		self.assertEqual(m.average_soundtrack, expected_soundtrack)
		self.assertEqual(m.average_acting, expected_acting)
		self.assertEqual(m.average_cinematography, expected_cinematography)
		self.assertEqual(m.average_plot, expected_plot)

	def test_numVotes_updates_on_create_and_delete(self):
		self.assertEqual(self.movie2.numVotes, 0)
		r = Rating.objects.create(movie=self.movie2, user=self.u4, overall_score=4)
		m_ref = Movie.objects.get(pk=self.movie2.pk)
		self.assertEqual(m_ref.numVotes, 1)
		r.delete()
		m_ref2 = Movie.objects.get(pk=self.movie2.pk)
		self.assertEqual(m_ref2.numVotes, 0)

class TestAuthEndpoints(APITestCase):
	"""
	TESTS US2.1 AND US2.2 (User registration and login endpoints)
	"""

	def setUp(self):
		self.client = APIClient()
		self.register_url = '/movies/register/'
		self.login_url = '/movies/login/'

	def test_register_creates_user(self):
		payload = {
			'username': 'newuser',
			'email': 'newuser@example.com',
			# Password must satisfy serializer regex: at least 8 chars, one upper, one lower, one digit
			'password': 'Secret123'
		}
		resp = self.client.post(self.register_url, payload, format='json')
		self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
		# User exists in DB
		self.assertTrue(User.objects.filter(username='newuser', email='newuser@example.com').exists())

	def test_register_duplicate_fails(self):
		# create initial user
		User.objects.create_user(username='dupe', email='dupe@example.com', password='Secret123')
		payload = {'username': 'dupe', 'email': 'dupe@example.com', 'password': 'Secret123'}
		resp = self.client.post(self.register_url, payload, format='json')
		self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

	def test_login_returns_tokens_with_valid_credentials(self):
		# create user via ORM
		User.objects.create_user(username='loginuser', email='login@example.com', password='Secret123')
		payload = {'email': 'login@example.com', 'password': 'Secret123'}
		resp = self.client.post(self.login_url, payload, format='json')
		# Depending on authentication backend/config, this should return tokens
		# Accept 200 OK with access/refresh keys; otherwise fail the test to signal config issue.
		self.assertEqual(resp.status_code, status.HTTP_200_OK)
		self.assertIn('access', resp.data)
		self.assertIn('refresh', resp.data)

	def test_login_wrong_credentials_returns_400(self):
		User.objects.create_user(username='bad', email='bad@example.com', password='Secret123')
		payload = {'email': 'bad@example.com', 'password': 'WrongPass'}
		resp = self.client.post(self.login_url, payload, format='json')
		self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

class TestRatingAPI(APITestCase):
	"""
	TESTS US3.1 AND US3.2 (Create, update or delete a rating of a movie via API)
	"""
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username="tester", email="t@example.com", password="secret")
		self.movie = Movie.objects.create(tconst="tt0000002", primary_title="API Movie", imdb_rating=5.0)

		# endpoint for ratings (registered under /movies/ratings/)
		self.ratings_url = "/movies/ratings/"

	def test_create_rating_requires_auth(self):
		payload = {
			"movie": self.movie.tconst,
			"overall_score": 8,
			"soundtrack": 7,
			"acting": 9,
			"cinematography": 8,
			"plot": 8
		}

		# Without authentication -> expect 401 or 403 depending on config
		resp = self.client.post(self.ratings_url, payload, format='json')
		self.assertIn(resp.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

	def test_create_or_update_rating_authenticated(self):
		# Authenticate the test client (force_authenticate avoids dealing with JWT)
		self.client.force_authenticate(user=self.user)

		payload = {
			"movie": self.movie.tconst,
			"overall_score": 8,
			"soundtrack": 7,
			"acting": 9,
			"cinematography": 8,
			"plot": 8
		}

		resp = self.client.post(self.ratings_url, payload, format='json')
		# The serializer/view may return 200 (update) or 201 (create)
		self.assertIn(resp.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))

		# A rating should exist in the DB
		self.assertEqual(Rating.objects.filter(movie=self.movie, user=self.user).count(), 1)

		# Now update the rating by POSTing again with a different overall_score
		payload['overall_score'] = 5
		resp2 = self.client.post(self.ratings_url, payload, format='json')
		self.assertIn(resp2.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))
		rating = Rating.objects.get(movie=self.movie, user=self.user)
		self.assertEqual(rating.overall_score, 5)

		# Check the GET user-rating endpoint returns the updated rating
		get_url = f'/movies/ratings/{self.movie.tconst}/'
		resp3 = self.client.get(get_url, format='json')
		self.assertEqual(resp3.status_code, status.HTTP_200_OK)
		# The response should contain the overall_score we set
		self.assertEqual(resp3.data.get('overall_score'), 5)

	def test_delete_rating_authenticated(self):
		# Create a rating first
		rating = Rating.objects.create(
			movie=self.movie,
			user=self.user,
			overall_score=7,
			soundtrack=6,
			acting=8,
			cinematography=7,
			plot=7
		)

		self.client.force_authenticate(user=self.user)
		delete_url = f'/movies/ratings/{self.movie.tconst}/'

		resp = self.client.delete(delete_url, format='json')
		self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

		# The rating should no longer exist
		self.assertFalse(Rating.objects.filter(movie=self.movie, user=self.user).exists())

class TestProfileAPI(APITestCase):
    """
    TESTS for User Profiles functionality.
    """
    def setUp(self):
        # We create users. The profile should be created automatically by the signal.
        self.user1 = User.objects.create_user(username='testuser1', email='user1@test.com', password='Testpassword1')
        self.user2 = User.objects.create_user(username='testuser2', email='user2@test.com', password='Testpassword2')

        # We add data to user1's profile for testing.
        self.user1.profile.bio = "This is user1's bio."
        self.user1.profile.save()

        # We create movies and ratings to test the average calculation.
        movie1 = Movie.objects.create(tconst='tt9000001', primary_title='Movie A')
        movie2 = Movie.objects.create(tconst='tt9000002', primary_title='Movie B')
        
        # user1 rates two movies (average of 8 and 6 = 7.0).
        Rating.objects.create(movie=movie1, user=self.user1, overall_score=8)
        Rating.objects.create(movie=movie2, user=self.user1, overall_score=6)
        
        # user2 rates one movie.
        Rating.objects.create(movie=movie1, user=self.user2, overall_score=9)

    def test_profile_is_created_on_user_registration(self):
        """Verifies that the post_save signal creates a Profile for a new User."""
        self.assertTrue(hasattr(self.user1, 'profile'))
        self.assertIsInstance(self.user1.profile, Profile)
        self.assertEqual(User.objects.count(), Profile.objects.count())

    def test_public_profile_endpoint_is_accessible(self):
        """Tests that anyone (unauthenticated) can view a public profile."""
        url = f'/movies/profiles/{self.user1.username}/'
        response = self.client.get(url, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # We verify that the data is correct.
        self.assertEqual(response.data['username'], self.user1.username)
        self.assertEqual(response.data['bio'], self.user1.profile.bio)

    def test_public_profile_average_rating_is_correct(self):
        """Tests that the average rating is calculated and displayed correctly."""
        url = f'/movies/profiles/{self.user1.username}/'
        response = self.client.get(url, format='json')

        # The expected average for user1 is (8 + 6) / 2 = 7.0
        self.assertEqual(response.data['average_rating'], 7.0)

        # We check user2's average just to be sure.
        url_user2 = f'/movies/profiles/{self.user2.username}/'
        response_user2 = self.client.get(url_user2, format='json')
        self.assertEqual(response_user2.data['average_rating'], 9.0)

    def test_my_profile_endpoint_requires_authentication(self):
        """Tests that /profiles/me/ returns 401 if the user is not authenticated."""
        url = '/movies/profiles/me/'
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # We also test with the PATCH method.
        response_patch = self.client.patch(url, {'bio': 'attempt'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_view_own_profile(self):
        """Tests that a logged-in user can make a GET request to /profiles/me/."""
        url = '/movies/profiles/me/'
        self.client.force_authenticate(user=self.user1) # We simulate the login.
        response = self.client.get(url, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user1.username)

    def test_authenticated_user_can_update_own_profile(self):
        """Tests that a logged-in user can make a PATCH request to update their profile."""
        url = '/movies/profiles/me/'
        self.client.force_authenticate(user=self.user1)
        
        new_bio = "This is my updated bio."
        payload = {'bio': new_bio}
        
        response = self.client.patch(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bio'], new_bio)
        
        # We verify that the change has been saved to the database.
        self.user1.profile.refresh_from_db()
        self.assertEqual(self.user1.profile.bio, new_bio)

    def test_user_cannot_update_another_users_profile(self):
        """Ensures a user cannot update another user's profile via the /me/ endpoint."""
        url = '/movies/profiles/me/'
        self.client.force_authenticate(user=self.user2) # We log in as user2.
        
        # We try to change user1's bio (but the endpoint points to /me/, which is user2's profile).
        payload = {'bio': 'hacked bio'}
        self.client.patch(url, payload, format='json')

        # We refresh user1's profile data from the DB.
        self.user1.profile.refresh_from_db()

        # user1's bio should NOT have changed.
        self.assertNotEqual(self.user1.profile.bio, 'hacked bio')
        self.assertEqual(self.user1.profile.bio, "This is user1's bio.")

    def test_get_user_ratings_list_returns_correct_data(self):
        """
        Tests the /profiles/<username>/ratings/ endpoint.
        """
        url = f'/movies/profiles/{self.user1.username}/ratings/'
        response = self.client.get(url, format='json')

        # Check for a successful response
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that the number of ratings is correct (user1 has 2 ratings)
        self.assertEqual(len(response.data), 2)

        # Check the content of one of the ratings to ensure it's correct
        # The list is ordered by most recent, so the last one created will be first.
        first_rating_in_response = response.data[0]
        self.assertEqual(first_rating_in_response['overall_score'], 6) # Corresponds to movie2 rating
        self.assertEqual(first_rating_in_response['movie_info']['tconst'], 'tt9000002')
        self.assertEqual(first_rating_in_response['movie_info']['primary_title'], 'Movie B')
        second_rating_in_response = response.data[1]
        self.assertEqual(second_rating_in_response['overall_score'], 8) # Corresponds to movie1 rating
        self.assertEqual(second_rating_in_response['movie_info']['tconst'], 'tt9000001')
        self.assertEqual(second_rating_in_response['movie_info']['primary_title'], 'Movie A')

    def test_get_user_ratings_list_for_user_with_no_ratings(self):
        """
        Tests that the endpoint returns an empty list for a user with no ratings.
        """
        # We create a new user who has no ratings
        user3 = User.objects.create_user(username='user3', email='user3@test.com', password='pw')
        url = f'/movies/profiles/{user3.username}/ratings/'
        response = self.client.get(url, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0) # Should be an empty list

    def test_get_user_ratings_list_for_nonexistent_user(self):
        """
        Tests that the endpoint returns a 404 Not Found for a user that does not exist.
        """
        url = '/movies/profiles/nonexistentuser/ratings/'
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_authenticated_user_can_upload_profile_photo(self):
        """
		Test that the user can upload profile photo via PATCH /me/.
		"""
        self.client.force_authenticate(user=self.user1)
        url = '/movies/profiles/me/'

		# Upload photo
        test_image = SimpleUploadedFile(
            "avatar.jpg", b"file_content", content_type="image/jpeg"
        )

        response = self.client.patch(
            url,
            data={},
            files={'photo': test_image},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.profile.refresh_from_db()
        self.assertIsNotNone(self.user1.profile.photo)

    def test_existing_photo_is_replaced_when_uploading_new_one(self):
        """
        Tests uploading a new photo replaces the old image file.
        """
        self.client.force_authenticate(user=self.user1)
        url = '/movies/profiles/me/'

        # Upload first photo
        first_image = SimpleUploadedFile(
            'initial.jpg', b'first', content_type='image/jpeg'
        )
        self.client.patch(
            url,
            data={},
            files={'photo': first_image},
            format='multipart'
        )
        old_path = self.user1.profile.photo.name

        # Upload second photo
        second_image = SimpleUploadedFile(
            'new.jpg', b'second', content_type='image/jpeg'
        )
        response = self.client.patch(
            url,
            data={},
            files={'photo': second_image},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user1.profile.refresh_from_db()
        new_path = self.user1.profile.photo.name

        self.assertNotEqual(old_path, new_path)
        self.assertIsNotNone(self.user1.profile.photo)

    def test_user_can_remove_photo(self):
        """
        Test if remove_photo=true is sent, existing photo should be deleted.
        """

        self.client.force_authenticate(user=self.user1)
        url = '/movies/profiles/me/'

        # Upload photo
        test_image = SimpleUploadedFile(
            "avatar.jpg", b"file_content", content_type="image/jpeg"
        )
        
        self.client.patch(
            url,
            data={},
            files={'photo': test_image},
            format='multipart'
        )
        self.assertIsNotNone(self.user1.profile.photo)

        # Remove photo
        response = self.client.patch(
            url, 
        	data={'remove_photo': 'true'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user1.profile.refresh_from_db()
        self.assertFalse(bool(self.user1.profile.photo))

class TestUserSearchAPI(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.u1 = User.objects.create_user(username='Aaron', email='a1@test.com', password='pw')
        self.u2 = User.objects.create_user(username='Bea', email='b2@test.com', password='pw')
        self.u3 = User.objects.create_user(username='Charlie', email='c3@test.com', password='pw')
        for u in [self.u1, self.u2, self.u3]:
            self.assertTrue(hasattr(u, 'profile'))

    def test_get_all_users_no_query(self):
        url = '/api/users/'
        resp = self.client.get(url, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 3)

        # Ajustado a la estructura plana
        usernames = [item['username'] for item in resp.data]
        self.assertCountEqual(usernames, ['Aaron', 'Bea', 'Charlie'])

    def test_get_all_users_with_query(self):
        url = '/api/users/?q=ar'
        resp = self.client.get(url, format='json')
        self.assertEqual(resp.status_code, 200)

        usernames = [item['username'] for item in resp.data]
        # "Aaron" y "Charlie" contienen "ar" (case-insensitive)
        self.assertCountEqual(usernames, ['Aaron', 'Charlie'])

    def test_get_all_users_empty_result(self):
        url = '/api/users/?q=zzz'
        resp = self.client.get(url, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 0)

    def test_response_structure(self):
        url = '/api/users/'
        resp = self.client.get(url, format='json')
        self.assertEqual(resp.status_code, 200)
        for item in resp.data:
            # Ahora comprobamos la estructura real
            self.assertIn('username', item)
            self.assertIn('bio', item)
            self.assertIn('photo', item)
            self.assertIn('average_rating', item)

class TestCommentAPI(APITestCase):
    """
    Tests for Hierarchical Comments (Threaded Comments)
    """
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username="u1", email="u1@test.com", password="pw")
        self.user2 = User.objects.create_user(username="u2", email="u2@test.com", password="pw")
        self.movie = Movie.objects.create(tconst="tt999999", primary_title="Comment Test Movie")
        
        self.manage_url = f'/movies/comments/{self.movie.tconst}/'
        self.list_url = f'/movies/{self.movie.tconst}/comments/'

    def test_create_root_comment(self):
        self.client.force_authenticate(user=self.user1)
        payload = {"text": "Root comment by u1"}
        resp = self.client.post(self.manage_url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comment.objects.count(), 1)
        c = Comment.objects.first()
        self.assertIsNone(c.parent)
        self.assertEqual(c.text, "Root comment by u1")

    def test_duplicate_root_comment_fails(self):
        self.client.force_authenticate(user=self.user1)
        # First creation
        self.client.post(self.manage_url, {"text": "First"}, format='json')
        # Second creation attempt
        resp = self.client.post(self.manage_url, {"text": "Second"}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        # Should still be 1 comment
        self.assertEqual(Comment.objects.count(), 1)

    def test_create_reply_allowed_even_if_root_exists(self):
        """
        User can create a reply even if they already have a root comment on the same movie.
        """
        self.client.force_authenticate(user=self.user1)
        # 1. Create root comment by User 1
        r1 = self.client.post(self.manage_url, {"text": "Root"}, format='json')
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        root_id = r1.data['id']

        # 2. Create reply by User 1 pointing to their own root
        payload = {"text": "Reply to myself", "parent_id": root_id}
        resp = self.client.post(self.manage_url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        self.assertEqual(Comment.objects.count(), 2)
        
        reply = Comment.objects.last()
        
        self.assertEqual(reply.text, "Reply to myself")
        self.assertIsNotNone(reply.parent)
        self.assertEqual(reply.parent.id, root_id)

    def test_get_root_comments_has_reply_count(self):
        """
        Verifica que al pedir comentarios de la peli, vienen sin anidar
        pero con el contador 'reply_count'.
        """
        c1 = Comment.objects.create(user=self.user1, movie=self.movie, text="Root")
        
        Comment.objects.create(user=self.user2, movie=self.movie, text="Reply 1", parent=c1)
        Comment.objects.create(user=self.user2, movie=self.movie, text="Reply 2", parent=c1)

        resp = self.client.get(self.list_url, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        
        root_data = resp.data[0]
        self.assertEqual(root_data['id'], c1.id)
        
        self.assertNotIn('replies', root_data)
        
        self.assertIn('reply_count', root_data)
        self.assertEqual(root_data['reply_count'], 2)

    def test_get_specific_replies_endpoint(self):
        """
        Verifica que podemos pedir las respuestas de un comentario específico en su propio endpoint.
        """
        c1 = Comment.objects.create(user=self.user1, movie=self.movie, text="Root")
        c2 = Comment.objects.create(user=self.user2, movie=self.movie, text="Reply A", parent=c1)
        
        # URL to see replies: /api/movies/comments/<id>/replies/
        replies_url = f'/movies/comments/{c1.id}/replies/'
        
        resp = self.client.get(replies_url, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['text'], "Reply A")
        self.assertEqual(resp.data[0]['parent_id'], c1.id)

    def test_update_root_comment(self):
        Comment.objects.create(user=self.user1, movie=self.movie, text="Original")
        self.client.force_authenticate(user=self.user1)
        
        payload = {"text": "Updated"}
        resp = self.client.patch(self.manage_url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        
        self.user1.refresh_from_db()
        # Fetch comment again
        c = Comment.objects.get(user=self.user1, movie=self.movie)
        self.assertEqual(c.text, "Updated")

    def test_delete_root_comment(self):
        c = Comment.objects.create(user=self.user1, movie=self.movie, text="To delete")
        # Add a reply to verify cascade delete (optional check)
        Comment.objects.create(user=self.user2, movie=self.movie, text="Reply", parent=c)
        
        self.client.force_authenticate(user=self.user1)
        resp = self.client.delete(self.manage_url, format='json')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        
        self.assertEqual(Comment.objects.count(), 0)
    
    def test_toggle_like(self):
        from .models import CommentLike # Importar dentro o arriba

        c = Comment.objects.create(user=self.user1, movie=self.movie, text="Like me")
        like_url = f'/movies/comments/{c.id}/like/'
        
        self.client.force_authenticate(user=self.user2)
        
        # 1. Add Like
        resp = self.client.post(like_url, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['liked'])
        self.assertEqual(resp.data['like_count'], 1)
        
        # Verificamos que existe el objeto CommentLike
        self.assertTrue(CommentLike.objects.filter(comment=c, user=self.user2).exists())
        
        # 2. Remove Like
        resp = self.client.post(like_url, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data['liked'])
        self.assertEqual(resp.data['like_count'], 0)
        
        self.assertFalse(CommentLike.objects.filter(comment=c, user=self.user2).exists())

    def test_root_comments_ordering_by_likes(self):
        """
        Root comments should be ordered by most likes first.
        """
        # Create 3 comments
        c1 = Comment.objects.create(user=self.user1, movie=self.movie, text="C1 No Likes")
        c2 = Comment.objects.create(user=self.user2, movie=self.movie, text="C2 Many Likes")
        
        # We need a 3rd user to differentiate counts
        u3 = User.objects.create_user(username="u3", email="u3@t.com", password="p")
        
        # C2 gets 2 likes
        CommentLike.objects.create(comment=c2, user=self.user1)
        CommentLike.objects.create(comment=c2, user=u3)
        
        # C1 gets 0 likes
        
        # Fetch list
        resp = self.client.get(self.list_url, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        
        # Order should be C2 (2 likes) then C1 (0 likes)
        self.assertEqual(resp.data[0]['id'], c2.id)
        self.assertEqual(resp.data[1]['id'], c1.id)

    def test_replies_ordering_is_still_chronological(self):
        """
        Replies should ignore likes for ordering and stick to creation date (ascending).
        """
        root = Comment.objects.create(user=self.user1, movie=self.movie, text="Root")
        
        # Create Reply 1 (Oldest)
        r1 = Comment.objects.create(user=self.user1, movie=self.movie, text="Reply 1", parent=root)
        
        # r1 gets 2 likes (should not move up because replies are chronological)
        CommentLike.objects.create(comment=r1, user=self.user1)
        CommentLike.objects.create(comment=r1, user=self.user2)
        
        # Create Reply 2 (Newest) - 0 Likes
        r2 = Comment.objects.create(user=self.user2, movie=self.movie, text="Reply 2", parent=root)
        
        replies_url = f'/movies/comments/{root.id}/replies/'
        resp = self.client.get(replies_url, format='json')
        
        # Order should be R1 then R2 (Chronological), despite R1 having more likes
        self.assertEqual(resp.data[0]['id'], r1.id)
        self.assertEqual(resp.data[1]['id'], r2.id)

