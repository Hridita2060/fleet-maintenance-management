# Database Schema

The persistence layer uses a relational database model mapped via Prisma.

## Core Entities

### User
Represents authentication and role profiles.
- `id`: UUID (Primary Key)
- `email`: String (Unique)
- `passwordHash`: String (Argon2 hash)
- `role`: Enum (`MANAGER`, `TECHNICIAN`)

### Vehicle
Represents a physical vehicle in the fleet.
- `id`: UUID (Primary Key)
- `registration`: String (Unique) - License plate or identification code
- `make` / `model` / `year`: Descriptive metadata
- `currentOdometer`: Int - The single source of truth for the vehicle's mileage (cannot be decreased)
- `dateIntervalDays`: Int - How frequently (in days) a service is required
- `mileageInterval`: Int - How frequently (in miles) a service is required
- `isArchived`: Boolean - Soft deletion flag

### ServiceRecord
A discrete maintenance workflow.
- `id`: UUID (Primary Key)
- `vehicleId`: Relation to `Vehicle`
- `description`: String - The nature of the repair/maintenance
- `status`: Enum (`DUE`, `BOOKED`, `IN_SERVICE`, `COMPLETED`)
- `scheduledDate`: DateTime (Optional, required for `BOOKED`)
- `completionDate`: DateTime (Optional, set automatically upon `COMPLETED`)
- `completionOdometer`: Int (Optional, required for `COMPLETED`)

### ServiceAssignment
A many-to-many junction table explicitly mapping a Technician to a Service Record.
- `recordId`: Relation to `ServiceRecord`
- `technicianId`: Relation to `User`
- Compound Unique Index: `[recordId, technicianId]`

### AuditEvent
An immutable, append-only ledger of historical actions.
- `id`: UUID (Primary Key)
- `recordId`: Relation to `ServiceRecord`
- `userId`: Relation to `User` (the actor who performed the action)
- `action`: Enum (`CREATED`, `STATUS_CHANGED`, `ASSIGNED`, `UNASSIGNED`, `NOTE_ADDED`)
- `oldValue` / `newValue`: String logs for state changes
- `timestamp`: DateTime (Generated automatically)

### Alert
A persistent notification indicating an overdue service.
- `id`: UUID (Primary Key)
- `vehicleId`: Relation to `Vehicle`
- `serviceRecordId`: Relation to `ServiceRecord` (The specific overdue DUE record)
- `isDismissed`: Boolean - (Users can soft-dismiss alerts)
- `createdAt`: DateTime
