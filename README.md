# Recipe Hub (MERN)
Share, search and manage recipes. Features: JWT auth, create/edit/delete your own recipes, ingredients and steps, categories, search by dish or ingredient, likes, light/dark theme.

## Quick start (one server, one port)
```
cp server/.env.example server/.env      # set MONGO_URI and JWT_SECRET
npm run install-all && npm run build
npm run seed                            # optional demo recipes (login chef@recipehub.dev / chef1234)
npm start                               # open http://localhost:5000
```

## Development mode (hot reload)
Requires Node 18+ and MongoDB (local or Atlas).
```
cd server && cp .env.example .env && npm install && npm run dev   # API on :5000
cd client && npm install && npm run dev                            # App on :5173
```
Edit `server/.env` for MONGO_URI and JWT_SECRET.

## API
POST /api/auth/register, /api/auth/login
GET /api/recipes?q=&category=&mine=1   GET /api/recipes/:id
POST /api/recipes, PUT /api/recipes/:id, DELETE /api/recipes/:id  (auth, owner only)
POST /api/recipes/:id/like (auth, toggle)
