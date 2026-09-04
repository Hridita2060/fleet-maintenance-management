# AI prompts

I developed the Fleet Maintenance Management application with AI used as a development assistant. I was responsible for understanding the requirements, deciding the implementation approach, testing the application, identifying issues, and validating the final behaviour. AI was used selectively for tasks such as generating implementation suggestions, debugging errors, improving individual features, and helping troubleshoot issues found during testing.

I did not treat AI-generated code as automatically correct. I reviewed and tested the generated changes against the assignment requirements and made corrections when the implementation did not behave as expected. The examples below document significant instances where AI assistance was used during development.

## Implementing the core application

### What you were trying to achieve

I wanted to build the core Fleet Maintenance Management application from the assignment requirements, including authentication, manager and technician roles, vehicle management, service records, technician assignments, service lifecycle, dashboard functionality, audit history, overdue alerts, and CSV functionality.

### Prompt

I provided the assignment requirements to the AI and asked it to help me implement the required Fleet Maintenance Management functionality, including the frontend, backend APIs, database models, authentication, role-based permissions, service lifecycle, technician assignments, dashboard, audit history, overdue alerts, and CSV operations. I also specified that important permissions and lifecycle rules needed to be enforced on the server rather than only in the frontend.

### What you got

The AI helped generate the initial implementation structure and code for the application, including the React frontend, Express backend, Prisma database layer, authentication, role-based access, service records, vehicles, technician assignments, and the main application workflows.

### What you corrected

I did not consider the initial implementation complete without testing it. I ran the application and checked the implemented features against the assignment requirements. When I found missing functionality or incorrect behaviour, I reported the specific issue to the AI and requested a targeted correction. I then retested the affected feature before moving on to the next requirement.

## Fixing technician assignment and reassignment

### What you were trying to achieve

I wanted Fleet Managers to be able to assign technicians to service records, remove assignments, and assign technicians again when required. The assignment history also needed to remain immutable.

### Prompt

I asked the AI to implement/fix the technician assignment functionality so that a Fleet Manager could assign and remove technicians from service records, support multiple technicians on a record, and record each assignment and unassignment in the audit history.

### What you got

The AI implemented the assignment and unassignment functionality and added the corresponding audit-history events.

### What you corrected

During manual testing, I found that after removing a technician there was initially no clear way to assign a technician again to the existing service record. I reported this issue and asked the AI to provide a reassignment path for Fleet Managers.

After the correction, I tested the complete sequence of assigning, unassigning, and reassigning a technician. The audit history preserved the previous ASSIGNED and UNASSIGNED events and created a new ASSIGNED event for the reassignment.

## Incorrect technician dropdown implementation

### What you were trying to achieve

I wanted the Assign Technician modal to display the available technicians so that a Fleet Manager could select one and assign them to a service record.

### Prompt

I asked the AI to fix the technician assignment interface so that available technicians would be displayed in the assignment dropdown.

### What you got

The initial implementation made the Assign Technician modal independently request the technician list when the modal opened. During testing, the dropdown appeared empty even though technician accounts existed in the system.

### What you corrected

I tested the feature in the actual application and identified that the technician list was not appearing. I reported the issue to the AI.

The implementation was then changed so that the Service Records page, which already had the available technician list, passed that list into the assignment modal instead of making a second request when the modal opened.

I retested the modal after the correction and confirmed that the available technicians appeared and could be assigned.
