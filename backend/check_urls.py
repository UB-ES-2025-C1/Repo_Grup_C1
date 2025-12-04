import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cinemaub.settings')
django.setup()

from django.urls import get_resolver

resolver = get_resolver()
print("\n=== URLs en movies.urls ===")
for pattern in resolver.url_patterns:
    if 'movies' in str(pattern.pattern):
        print(f"\nPrefix: {pattern.pattern}")
        if hasattr(pattern, 'url_patterns'):
            for sub_pattern in pattern.url_patterns:
                full_pattern = str(pattern.pattern) + str(sub_pattern.pattern)
                if 'comment' in full_pattern.lower():
                    print(f"  {full_pattern} -> {sub_pattern.name}")
