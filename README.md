# Fleet Maintenance Management

Fleet Maintenance Management is a full-stack web application designed for a logistics company to reliably manage their vehicle service lifecycles. It tracks date-based and mileage-based service intervals, enforces a strict `Due -> Booked -> In Service -> Completed` state machine, and isolates technician workloads from manager oversight.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database (e.g. locally or via Render/Supabase Postgres)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Hridita2060/fleet-maintenance-management.git
   cd fleet-maintenance-management
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Environment Variables
Create a `.env` file in the `backend/` directory:
```env
# Example environment variables (do not use real secrets here)
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/fleet_db
JWT_SECRET=your_super_secret_jwt_key
OVERDUE_GRACE_PERIOD_DAYS=7
```

### Database Setup & Seeding

Navigate to the `backend/` directory and run:
```bash
npx prisma db push
npx prisma generate
```

*(Optional)* Run a seed script if you have created one, or create initial Manager/Technician users manually via Prisma Studio (`npx prisma studio`).

### Development Commands

**Start the Backend**:
```bash
cd backend
npm run dev
```
*(Runs the Express server on http://localhost:3000 with nodemon)*

**Start the Frontend**:
```bash
cd frontend
npm run dev
```
*(Runs the Vite React SPA on http://localhost:5173)*

### Testing Commands
The backend features a robust integration and security test suite testing real DB interactions:
```bash
cd backend
npm test
```

### Frontend Build
To compile the frontend for production deployment:
```bash
cd frontend
npm run build
```

## API Overview
The backend exposes a secure REST API located at `/api`.
- `POST /api/auth/login` - Authenticate users
- `GET /api/vehicles` - List active vehicles
- `PATCH /api/vehicles/:id` - Update vehicle (Manager only)
- `POST /api/vehicles/bulk-odometer` - CSV bulk upload odometers (Manager only)
- `GET /api/service-records` - Fetch service records (pagination, search, filtering)
- `PATCH /api/service-records/:id` - Progress a service lifecycle
- `GET /api/dashboard/metrics` - Fetch real-time dashboard data
- `GET /api/alerts` - Fetch overdue alerts

## Roles
- **Manager**: Global access. Can create vehicles, assign technicians, upload CSVs, and view the entire fleet.
- **Technician**: Scoped access. Can only view and update service records explicitly assigned to them. Cannot edit vehicle metadata or reassign tickets.

## Deployment Instructions

### Backend (Render Web Service)
1. Create a new Web Service on Render, connected to this GitHub repo.
2. Root Directory: `backend`
3. Build Command: `npm install && npx prisma generate && npx tsc`
4. Start Command: `node dist/index.js`
5. Environment Variables: Supply `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`.

### Frontend (Render Static Site / Vercel)
1. Create a new Static Site (or Vercel project).
2. Root Directory: `frontend`
3. Build Command: `npm install && npm run build`
4. Publish Directory: `dist`
5. Environment Variables: Set `VITE_API_URL` to the backend's public URL.

## Assumptions & Limitations
- **Vehicle Archiving**: Service histories of archived vehicles remain intact, but active service records belonging to archived vehicles are excluded from dashboard Overdue calculations.
- **Overdue Baseline**: If a vehicle has 0 completed services, the engine defaults to a long-ago date to gracefully handle brand-new vehicles that have already accumulated miles beyond their interval.
