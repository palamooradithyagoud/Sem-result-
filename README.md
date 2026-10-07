# Student Academic Management & Analytics System

Phase 1 foundation for HOD academic data management.

## Structure

- `client` - React, Vite, TypeScript, Tailwind CSS
- `server` - Node.js, Express, TypeScript, MongoDB, Excel parsing

## Local Setup

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGODB_URI`, `JWT_SECRET`, and optional bootstrap admin credentials.
3. Install dependencies with `npm install`.
4. Run both apps with `npm run dev`.

The application does not seed academic records. Dashboard values, tables, uploads, and previews are based only on MongoDB data and uploaded Excel workbooks.
