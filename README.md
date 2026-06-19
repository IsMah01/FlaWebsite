# FlaWebsite

Split deployment architecture for the Future Leaders Foundation platform.

The canonical backend entry point is `api/boot.ts`. The backend image compiles
that file and the route modules under `api/`; no second standalone server is
maintained.

## Services

- `nginx`: public reverse proxy
- `frontend`: React/Vite static app served by Nginx
- `backend`: Node.js API service
- `mysql`: MySQL 8 database
- `mysql_data`: persistent database volume
- `private_uploads`: persistent private upload volume

## Local Docker Run

```bash
cp .env.example .env
docker compose up -d --build
```

Open:

```txt
http://localhost
```

Health checks:

```txt
http://localhost/api/health
http://localhost/api/db-health
```

- `/api/health` checks that the API process is responding.
- `/api/db-health` also checks that MySQL is reachable and returns HTTP 503
  when the database is unavailable.

## Production Notes

- Keep secrets in `.env`, not inside Docker images.
- Put HTTPS at the VPS edge with host Nginx/Certbot or a TLS-aware proxy.
- Back up the `mysql_data` volume regularly.
- Keep uploaded private documents in the `private_uploads` volume or move them to object storage later.
- Upload and authentication limits are persisted in MySQL, so they remain
  effective after a restart and across multiple backend instances.
- Activity videos are downloaded only when a visitor starts playback and are
  cached by Nginx for 30 days.
