# Planitt POS

Production-oriented POS implementation contained fully inside the `POS/` folder.

## Backend

1. Copy `backend/.env.example` to `backend/.env` and configure values.
2. Install dependencies:
   - `cd backend`
   - `npm install`
3. Start API:
   - `npm run dev` or `npm start`

## Frontend

1. Copy `frontend/.env.example` to `frontend/.env`.
2. Install dependencies:
   - `cd frontend`
   - `npm install`
3. Start UI:
   - `npm run dev`

## Major API groups

- `/api/auth`
- `/api/dashboard`
- `/api/sessions`
- `/api/bills`
- `/api/printing`
- `/api/products`
- `/api/inventory`
- `/api/purchase-orders`
- `/api/reports`
- `/api/returns-voids`
