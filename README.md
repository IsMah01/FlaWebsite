# FlaWebsite

Split deployment architecture for the Future Leaders Foundation platform.

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

## Production Notes

- Keep secrets in `.env`, not inside Docker images.
- Put HTTPS at the VPS edge with host Nginx/Certbot or a TLS-aware proxy.
- Back up the `mysql_data` volume regularly.
- Keep uploaded private documents in the `private_uploads` volume or move them to object storage later.
