# Client Project Tracker — Backend

Laravel 12 REST API for the Angular SPA in `../frontend`. See the root `README.md` for full setup, the API
reference and design notes.

```bash
composer install
cp .env.example .env && php artisan key:generate   # then set DB_PASSWORD (or switch to SQLite)
php artisan migrate:fresh --seed                    # 12 projects from test_data.json + demo user
php artisan serve                                   # http://127.0.0.1:8000
php artisan test                                    # in-memory SQLite, no DB setup needed
./vendor/bin/pint --test
```
