# Architecture Overview

Fleet Maintenance Management is a full-stack web application designed for robust, secure, and performant management of vehicle service lifecycles.

## Technology Stack
- **Frontend**: React (Vite, TypeScript), TailwindCSS, React Router v6, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Zod.
- **Database**: PostgreSQL (hosted on Render), accessed via Prisma ORM.
- **Authentication**: JWT secured with HttpOnly cookies.

## System Components

### 1. The Frontend Client
A responsive Single Page Application (SPA) built with Vite and React.
- **State Management**: React state and Context API (`AuthContext`).
- **Routing**: Client-side routing with `react-router-dom`. All routes except `/login` are protected by a `ProtectedRoute` wrapper.
- **Role-based UI**: Components dynamically check the authenticated user's `role` (`MANAGER` vs `TECHNICIAN`) to show/hide controls (e.g. assigning records, bulk importing CSVs, fetching dashboard metrics).

### 2. The API Server
A RESTful Express server running in Node.js.
- **Security Middlewares**: `authenticate` parses the HttpOnly JWT. `requireManager` strictly enforces authorization bounds.
- **Validation**: API inputs (JSON and CSV) are parsed and validated safely using `zod`.
- **Controllers**: Thin controllers that handle HTTP logic and delegate to Prisma for database transactions.

### 3. The Due Engine (`dueEngine.ts`)
A centralized state-calculation module used by the Dashboard metrics API.
- Calculates dynamic `DUE` and `OVERDUE` states in memory using the latest `COMPLETED` service baseline, comparing it against the vehicle's predefined date and mileage intervals.

### 4. Persistence Layer (Prisma & Render PostgreSQL)
- **Database**: Uses PostgreSQL to enforce referential integrity.
- **Prisma**: The ORM provides type-safe queries. Complex logic like pagination, multi-field filtering, and sorting are delegated completely to Prisma to avoid pulling heavy datasets into the Node memory space. 

## Data Flow Example (Technician updates a Service Record)
1. **Frontend**: Technician clicks "Start Service" on the UI.
2. **Backend Route**: Request hits `PATCH /api/service-records/:id`.
3. **Auth Middleware**: Server extracts the HttpOnly JWT token, verifies the signature, and attaches `req.user`.
4. **Validation**: Zod verifies the `{ status: 'IN_SERVICE' }` payload.
5. **Authorization**: The controller queries the database to confirm `req.user.userId` is explicitly assigned to this `ServiceRecord`. If not, a `403 Forbidden` is returned.
6. **State Machine Verification**: The backend verifies the transition `BOOKED -> IN_SERVICE` is legal.
7. **Transaction**: A database transaction commits the status update and appends an immutable `AuditEvent`.
8. **Response**: The updated record is returned and the UI optimistic state updates.
