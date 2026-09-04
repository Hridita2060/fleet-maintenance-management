# Plan

- How did you break the work into sessions?
- I broke the work into three logical sessions. The first session focused purely on data modeling and the backend API, ensuring the foundation (Prisma schema, Express controllers, and authentication) was solid and secure. The second session focused on the frontend implementation, wiring up the React UI to the API and building the core workflows (Dashboard, Vehicles, Service Records). The third session was dedicated entirely to bug fixing, robust role-based access control, UI refinement (like the Assignment modal and Service filtering), and documentation.
  
- What order did you build in, and why that order?
- I built the database schema first, followed by the backend REST API, and finally the frontend React application. This order was necessary because the frontend relies entirely on the API to function, and the API relies on the database schema to define the core business logic (e.g., service lifecycles, due/overdue calculation, and append-only audit logs). Building bottom-up ensured that constraints were enforced at the lowest level before being exposed to the UI.
  
- What did you estimate versus what it actually took?
- I estimated that the backend CRUD operations and authentication would take the longest amount of time. In reality, the backend went quite smoothly thanks to Prisma and Zod. What actually took much longer than estimated was refining the frontend UI state and edge cases, particularly ensuring that the Technician Assignment workflow behaved correctly, that UI elements updated dynamically, and that complex state like the 8-week completion chart was calculated accurately.
  
- What did you cut when you ran short?
- When time ran short, I decided to cut complex end-to-end (E2E) browser automation tests (e.g. Cypress or Playwright) and focused strictly on making sure the manual workflows were robust and that backend unit/integration tests covered the critical state machine constraints. I also simplified the UI aesthetics slightly, using Tailwind utility classes for a clean functional look rather than building complex bespoke micro-animations for every interaction.
