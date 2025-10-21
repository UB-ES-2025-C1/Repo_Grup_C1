import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.conf import settings

from movies.models import Movie


class Command(BaseCommand):
    help = 'Load movies from backend/public/reduced_database/movies_enriched.json (backend-only)'

    def add_arguments(self, parser):
        parser.add_argument('--copy-images', action='store_true', help='Copy poster files from backend locations into MEDIA_ROOT')
        parser.add_argument('--json-path', type=str, default=None, help='Path to JSON file (default: backend/public/reduced_database/movies_enriched.json)')

    def handle(self, *args, **options):
        # repo root is one level above backend
        repo_root = Path(__file__).resolve().parents[4]

        default_json = repo_root / 'backend' / 'public' / 'reduced_database' / 'movies_enriched.json'
        json_path = Path(options['json_path']) if options.get('json_path') else default_json

        if not json_path.exists():
            self.stderr.write(self.style.ERROR(f'JSON file not found: {json_path}'))
            return

        with json_path.open('r', encoding='utf-8') as f:
            movies = json.load(f)

        media_root = Path(getattr(settings, 'MEDIA_ROOT', repo_root / 'backend' / 'media'))
        media_root.mkdir(parents=True, exist_ok=True)

        created = 0
        updated = 0

        for item in movies:
            tconst = item.get('tconst')
            primary_title = item.get('primaryTitle') or item.get('primary_title')
            start_year = item.get('startYear') or item.get('start_year')
            description = item.get('description')
            poster_path = item.get('poster_path')
            poster_attribution = item.get('poster_attribution')
            num_votes = item.get('numVotes') or item.get('num_votes') or 0
            imdb_rating = item.get('imdbRating') or item.get('imdb_rating') or 0.0

            movie, created_flag = Movie.objects.get_or_create(
                tconst=tconst,
                defaults={
                    'primary_title': primary_title,
                    'start_year': start_year,
                    'description': description,
                    'poster_path': poster_path,
                    'poster_attribution': poster_attribution,
                    'num_votes': num_votes,
                    'imdb_rating': imdb_rating,
                }
            )

            if not created_flag:
                changed = False
                if primary_title and movie.primary_title != primary_title:
                    movie.primary_title = primary_title
                    changed = True
                if start_year and movie.start_year != start_year:
                    movie.start_year = start_year
                    changed = True
                if description and movie.description != description:
                    movie.description = description
                    changed = True
                if poster_path and movie.poster_path != poster_path:
                    movie.poster_path = poster_path
                    changed = True
                if poster_attribution and movie.poster_attribution != poster_attribution:
                    movie.poster_attribution = poster_attribution
                    changed = True
                if num_votes and movie.num_votes != num_votes:
                    movie.num_votes = num_votes
                    changed = True
                if imdb_rating and movie.imdb_rating != imdb_rating:
                    movie.imdb_rating = imdb_rating
                    changed = True
                if changed:
                    movie.save()
                    updated += 1
            else:
                created += 1

            # Copy images only from backend folders
            if options.get('copy_images') and poster_path:
                filename = Path(poster_path).name
                candidates = [
                    repo_root / 'backend' / 'media' / 'posters' / filename,
                    repo_root / 'backend' / 'static' / 'posters' / filename,
                    repo_root / 'backend' / 'public' / 'static' / 'posters' / filename,
                ]

                found = None
                for c in candidates:
                    if c.exists():
                        found = c
                        break

                if found:
                    target_dir = media_root / 'posters'
                    target_dir.mkdir(parents=True, exist_ok=True)
                    target_file = target_dir / filename
                    if not target_file.exists():
                        with found.open('rb') as s, target_file.open('wb') as d:
                            d.write(s.read())
                    movie.poster_path = str(getattr(settings, 'MEDIA_URL', '/media').rstrip('/') + '/posters/' + filename)
                    movie.save()

        self.stdout.write(self.style.SUCCESS(f'Finished: created={created}, updated={updated}'))