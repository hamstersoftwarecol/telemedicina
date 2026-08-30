# Telemedicina — Plataforma de Telemedicina

Plataforma completa de telemedicina con backend, frontend y app móvil.

- **Backend**: Cloudflare Workers + Hono + D1 (SQLite) + KV + R2
- **Frontend**: Vite + React + Tailwind + shadcn/ui
- **Mobile**: Flutter
- **Deploy**: Cloudflare Workers & Pages (GitHub Actions)

## Estructura

```
telemedicina/
├── backend/   # API Workers (Hono)
├── frontend/  # SPA React
├── mobile/    # App Flutter
└── .github/workflows/ # CI/CD Cloudflare
```

## Quick Start

### Backend
```bash
cd backend
npm install
cp .dev.vars.example .dev.vars # rellenar secretos
cp wrangler.toml.example wrangler.toml # ajustar si es necesario
npx wrangler d1 execute telemedicina-db --local --file=./db/migrations/0001_initial_schema.sql
npx wrangler dev # http://localhost:8787
```

Secretos en producción (no van en wrangler.toml):
```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put JWT_REFRESH_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put CLOUDFLARE_API_TOKEN
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local # ajustar VITE_API_URL
npm run dev # http://localhost:5173
npm run build
```

### Mobile
```bash
cd mobile
flutter pub get
flutter run
```

## Variables de entorno

Ver `backend/.dev.vars.example`, `backend/wrangler.toml.example` y `frontend/.env.example`.

## Deploy

Push a `main` despliega automáticamente via GitHub Actions (requiere secrets `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en el repo).
