# Design Decisions

## 1. Authentication (HttpOnly Cookies vs LocalStorage)
**Decision**: Use `HttpOnly` cookies to store JWT tokens instead of LocalStorage.
**Rationale**: `HttpOnly` cookies strictly prevent client-side JavaScript from accessing the token. This eliminates the risk of XSS (Cross-Site Scripting) attacks stealing session credentials. The browser automatically attaches the cookie to API requests (provided `withCredentials: true` is set in CORS/Axios config).

## 2. Server-side State Machine (Service Lifecycle)
**Decision**: Enforce the `DUE -> BOOKED -> IN_SERVICE -> COMPLETED` lifecycle directly in the API controller (`serviceRecord.ts`), rather than relying on frontend UI validation.
**Rationale**: The UI is not a security boundary. A malicious user or bugged client could send `{ status: 'COMPLETED' }` directly to the API without setting a `completionOdometer` or scheduling a date. The backend rigorously enforces all preconditions.

## 3. Append-Only Audit Logging
**Decision**: Audit logs (`AuditEvent`) are created in the same database transaction as the primary mutation (e.g., updating a status or adding a note). The API provides no `DELETE` or `PATCH` endpoints for Audits.
**Rationale**: Guarantees a fully immutable, cryptographically trustworthy timeline of events for accountability.

## 4. Separation of Due vs Overdue
**Decision**: `DUE` is a persisted `Status` on a `ServiceRecord`. However, `OVERDUE` is NOT a status. It is a dynamically calculated, point-in-time evaluation.
**Rationale**: "Overdue" depends entirely on the passage of time against the `OVERDUE_GRACE_PERIOD_DAYS`. Updating thousands of rows from `DUE` to `OVERDUE` via a cron job every midnight is brittle. Instead, `dueEngine.ts` calculates overdue metrics on the fly whenever the Dashboard is requested, and generates `Alert` rows to ensure managers are notified.

## 5. CSV Import & Partial Success
**Decision**: `POST /api/vehicles/bulk-odometer` validates every single row, updates the valid ones, and returns a 207 Multi-Status response with an array of specific row failures.
**Rationale**: In bulk data entry, failing an entire 500-row CSV file because row #499 had a negative odometer creates a poor UX. Providing a structured partial-success report allows the user to immediately understand and correct just the broken rows.

## 6. Migration from Supabase to Render PostgreSQL
**Decision**: The project utilizes Render's managed PostgreSQL instance via standard URI connection strings, moving away from Supabase's edge stack.
**Rationale**: Standard Postgres gives full control over the connection lifecycle and plays seamlessly with standard Express APIs.
