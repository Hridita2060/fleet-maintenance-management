# Submission

Fill this in and commit it. This is the first file we open.

## Links

- **GitHub repository:** https://github.com/Hridita2060/fleet-maintenance-management
- **Live application:** https://fleet-maintenance-management.onrender.com

## Notes for the reviewer

The application is hosted on Render's free tier. Both the backend web service and frontend static site may take **30–60 seconds to wake up** on the first request after a period of inactivity. Once awake, subsequent requests are fast.

The backend API runs at `https://fleet-maintenance-backend-polj.onrender.com`. The frontend and backend are on separate Render services (different origins), so cross-origin cookies use `SameSite=None; Secure`.

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Fleet Manager | manager@example.com | manager123 |
| Technician | tech1@example.com | tech123 |
| Technician | tech2@example.com | tech123 |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | React 18 + TypeScript, Vite, TailwindCSS, React Router v6, Axios, Lucide icons | Vite for fast builds, TypeScript for type safety, Tailwind for rapid UI development. |
| Backend | Node.js + Express 4, TypeScript, Zod, bcryptjs, jsonwebtoken, csv-parse/csv-stringify | Express for familiarity and speed. Zod for runtime input validation. JWT in HttpOnly cookies for stateless, secure auth. |
| Database | PostgreSQL (Render managed), Prisma ORM | PostgreSQL for relational integrity. Prisma for type-safe queries and schema management. |
| Hosting | Render (Web Service for backend, Static Site for frontend, managed PostgreSQL for database) | Free tier with simple Git-based deploys. Keeps all three services in one platform. |

## Goal checklist

Mark each honestly. Partial is fine — say what is partial.

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | JWT auth with HttpOnly cookies. Manager and Technician roles enforced server-side via `authenticate` and `requireManager` middleware. Technicians cannot create vehicles, change intervals, or reassign records — enforced on the server, not just hidden in UI. |
| 2 | Vehicles | Partial | Managers can create, edit, and archive/restore vehicles with registration, make, model, odometer, date interval, and mileage interval. Odometer-decrease validation is enforced. The `year` field from the assignment brief is not in the schema — vehicles are identified by registration, make, and model. |
| 3 | Service records and lifecycle | Done | Strict server-side state machine: DUE → BOOKED → IN\_SERVICE → COMPLETED. Booking requires a scheduled date and at least one technician assignment. Completion requires a completion odometer reading. Invalid transitions return 400. Completing a service records the date and odometer for interval calculations. |
| 4 | Service due engine | Done | Calculates next-due date and next-due mileage from the last completed service. Uses configurable `OVERDUE_GRACE_PERIOD_DAYS` env var. Compares both date-based and mileage-based intervals against vehicle state. |
| 5 | Technician assignments and authorization | Done | Many-to-many via `ServiceAssignment` junction table. Only managers can assign/unassign (enforced by `requireManager`). Technicians see only records assigned to them — enforced in every query. Direct API access to unassigned records returns 403. |
| 6 | Finding service records (search, filter, paginate) | Done | Server-side text search over descriptions, filters for vehicle/status/technician, sorting by multiple fields, and pagination with total/page/pageSize/totalPages metadata. All filtering happens in Prisma queries, not in the browser. Authorization scoping is preserved across all filter combinations. |
| 7 | Bulk odometer CSV and service record export | Done | `POST /api/vehicles/bulk-odometer` accepts CSV upload via multer, validates each row individually, rejects rows with decreasing odometer or unknown registration, and applies valid rows even when others fail (partial-success with per-row error reporting). `GET /api/service-records/export` produces CSV with current filters applied. |
| 8 | Dashboard and metrics | Partial | Shows headline numbers: active vehicles, services due, overdue, booked, in service, completed — all computed from current DB state, not frontend. Scoped to technician-assigned records when logged in as technician. **Missing:** breakdown of records by technician and chart of services completed per week over the last 8 weeks. |
| 9 | Immutable audit history | Done | Append-only `AuditEvent` model records CREATED, STATUS\_CHANGED, ASSIGNED, UNASSIGNED, and NOTE\_ADDED events with actor ID, timestamp, old/new values. Created inside the same database transaction as the mutation. No API endpoints exist to edit or delete audit events. Technicians can only view audit history for records assigned to them. |
| 10 | Overdue alerts and dismissal | Partial | Alerts are generated dynamically by the due engine and persisted in the `Alert` table. Managers can dismiss alerts. Alerts only show for records still in DUE status. **Missing:** count badge in the navigation bar. Alert re-creation after dismissal for the same service record is suppressed — a new alert is only generated for a new service record in a future service cycle. |

## How much time did you actually spend?

Approximately 12–14 hours across multiple sessions, including implementation of all milestones, debugging deployment issues (CORS, cross-origin cookies, Render free-tier configuration), writing integration tests, and preparing documentation.

## What would you do next, with another 12 hours?

1. **Dashboard charts and breakdowns** — Add the 8-week completed-services-per-week chart (using a lightweight library like Recharts) and the breakdown of records by technician, which the assignment explicitly requires.
2. **Alert count badge in navigation** — Display a live count of active overdue alerts as a badge on the Dashboard nav item, as specified by the assignment.
3. **Vehicle detail page** — Add a dedicated vehicle detail view that shows all service records for a specific vehicle, making the "opening a vehicle shows its service history" requirement more explicitly navigable. The backend API already supports `?vehicleId=` filtering.
4. **End-to-end testing** — Add Playwright or Cypress tests covering the full login → create vehicle → create service → lifecycle → audit flow, instead of relying only on backend integration tests.
5. **Vehicle year field** — Add the missing year attribute to the Prisma schema, validators, controllers, and frontend forms.

## What are you least happy with in this codebase, and why?

The dashboard is the weakest area. The assignment explicitly asks for a breakdown by technician and a chart of services completed per week over the last eight weeks, and neither is implemented. The headline metric cards are functional and data is computed from real DB state, but the gap against the full specification is visible. I prioritized the core lifecycle, authorization, and audit systems — which are the backbone of the application — over dashboard visualization, and I would close that gap first with more time.
