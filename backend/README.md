# Backend Enterprise Readiness Notes

## Run locally

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## Environment variables

Use the values from [.env.example](.env.example) to configure host, port, environment, and CORS origins.

## Health endpoints

- GET /api/health
- GET /api/ready
