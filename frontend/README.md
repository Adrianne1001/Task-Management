# Client Project Tracker — Frontend

Angular 21 + Angular Material SPA for the Laravel API in `../backend`. See the root `README.md` for full setup.

```bash
npm ci              # install exactly what package-lock.json pins
npm start           # http://localhost:4200, proxies /api and /sanctum to http://127.0.0.1:8000
npm test            # Vitest unit tests
npm run build       # production build in dist/
npm run format:check
```

The backend must be running (`php artisan serve` in `../backend`). The dev proxy keeps the SPA and the API on one
origin, which Sanctum's cookie authentication and Angular's XSRF handling rely on.
