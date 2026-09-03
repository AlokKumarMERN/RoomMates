# Project: RoomMates — Smart Roommate Expense Management System

Build a complete, production-style full-stack web application called **"RoomMates"**.

RoomMates is a roommate expense-management platform that allows people living together to create/join groups using a unique room code and track shared daily expenses. The application automatically calculates total spending, average spending, individual contributions, differences from the average, and who owes money to whom.

The application should feel like a **real-world SaaS/product website**, not a basic college project.

---

# 1. Technology Stack

Use the **MERN stack**:

### Frontend

* React.js
* Vite
* JavaScript or TypeScript (prefer TypeScript if practical)
* React Router
* Context API or Zustand for global state
* Axios or Fetch API
* CSS Modules / Tailwind CSS / lightweight CSS solution
* Recharts or another lightweight chart library where useful

### Backend

* Node.js
* Express.js
* REST API architecture
* JWT authentication
* bcrypt/bcryptjs for password hashing
* MongoDB
* Mongoose

### Database

MongoDB should store:

* Users
* Rooms/Groups
* Room members
* Expenses
* Expense edit history
* Settlement/payment information
* User activity/history where appropriate

### Development

Provide:

* Clean folder structure
* `.env.example`
* Environment-based configuration
* Proper error handling
* API validation
* Authentication middleware
* Authorization middleware
* MongoDB connection handling
* Reusable frontend components
* Reusable backend services/controllers
* README with complete setup instructions

---

# 2. Main Product Concept

A user creates an account and logs into RoomMates.

After login, the user can:

1. Create a room/group.
2. Generate a unique room code.
3. Share the code with roommates.
4. Other users enter the same code to join the room.
5. Everyone in that room shares the same expense calculation.
6. Users can add daily expenses.
7. The system calculates:

   * Total room expenses
   * Average expense per member
   * Amount spent by every member
   * Difference between individual spending and average
   * Who should receive money
   * Who should pay money
   * Settlement suggestions
8. Every expense is stored permanently.
9. Expense history is maintained.
10. Edited expenses must retain their previous value.
11. Only the original expense creator can edit their expense.
12. When an expense is edited:

    * Display "Edited"
    * Show previous value/history
    * Use the new value for all calculations
13. Users can belong to multiple rooms.
14. A single user can create multiple room codes.

---

# 3. Important Room-Code Logic

Room codes are central to the application.

Example:

Room Code: `RM-7X92AB`

Initially:

Member A joins
Member B joins
Member C joins
Member D joins

The room currently has 4 members.

All calculations are based on these 4 members.

If another person joins:

Member E joins

The room now has 5 members.

From that point onward, the room's current calculations should use 5 members.

However, **historical expenses must never be destroyed or incorrectly rewritten**.

The application must clearly distinguish:

* Current room membership
* Historical expenses
* Historical calculation periods

Design the database and calculation architecture so historical records remain reliable even when members join or leave.

Do NOT simply recalculate old historical records in a way that changes their original meaning.

---

# 4. Multiple Room Support

One user can belong to multiple rooms.

Example:

User: Rahul

Rooms:

* Home Room
* Office Room
* Trip Room
* Vegetarian Group
* Non-Vegetarian Group

Each room must have its own:

* Room code
* Members
* Expenses
* Expense history
* Calculations
* Settlement information
* Settings

Never mix expenses between rooms.

A user should be able to switch between rooms easily.

---

# 5. Example Use Case

Suppose four roommates live together:

* Alok
* Rahul
* Aman
* Rohit

Expenses:

Alok → ₹400
Rahul → ₹200
Aman → ₹600
Rohit → ₹800

Total:

₹2,000

Average:

₹500 per person

The dashboard should show:

Alok → ₹400 → ₹100 below average
Rahul → ₹200 → ₹300 below average
Aman → ₹600 → ₹100 above average
Rohit → ₹800 → ₹300 above average

Then calculate a reasonable settlement.

For example:

Rahul and Alok need to contribute money.

Aman and Rohit should receive money.

Show a simplified settlement such as:

Rahul → Aman ₹200
Rahul → Rohit ₹100
Alok → Rohit ₹200

The exact settlement algorithm should minimize unnecessary transactions where possible.

---

# 6. Expense Creation

Create an attractive "Add Expense" interface.

Fields:

* Amount
* Description
* Category
* Paid by
* Date
* Optional note
* Optional receipt/image
* Split method

Categories could include:

* Food
* Groceries
* Rent
* Electricity
* Water
* Internet
* Cleaning
* Transportation
* Entertainment
* Shopping
* Other

The system should support different split methods where practical:

### Equal Split

Divide the expense equally among selected members.

### Custom Split

Allow users to specify individual amounts.

### Percentage Split

Allow percentage-based splitting.

### Select Members

Allow an expense to be shared by only selected members.

Example:

Five people live in a room.

Only three people eat dinner.

The dinner expense can be split among those three people instead of all five.

---

# 7. Vegetarian / Non-Vegetarian Use Case

The system should support sub-groups or tags.

Example:

Room has:

5 people

Vegetarian:

* A
* B
* C

Non-Vegetarian:

* D
* E

A user can create separate room/group codes if they want completely independent calculations.

Alternatively, expenses can be assigned to selected members/categories.

Example:

Vegetarian dinner → split among A, B, C

Non-vegetarian dinner → split among D, E

General grocery expense → split among all 5

Make the system flexible enough to support these real-world scenarios without hard-coding "vegetarian" as the only subgroup type.

---

# 8. Expense Editing Rules

This is extremely important.

Once an expense is created:

Normal users cannot edit another user's expense.

Only the original creator/owner of the expense can edit it.

When the creator edits it:

Example:

Original:

Dinner
₹500

After editing:

Dinner
₹650

The UI must show:

₹650
**Edited**

And users should be able to view:

Original amount: ₹500
Updated amount: ₹650
Edited by: User Name
Edited at: Date/Time

Maintain an expense revision/history collection or embedded revision structure.

Every edit should record:

* Previous value
* New value
* Changed fields
* User who edited it
* Timestamp

The current/latest value should be used in calculations.

Do not physically destroy the previous value.

---

# 9. Expense Deletion

Do not permanently delete expenses immediately.

Prefer a soft-delete approach.

When an expense is deleted:

* Mark it as deleted
* Keep the original record/history
* Exclude it from current calculations
* Preserve audit information

Show appropriate history if needed.

Only the creator should be allowed to delete their expense unless the room owner/admin has appropriate permissions.

---

# 10. Dashboard

Create a modern, responsive dashboard.

The dashboard should display:

### Summary Cards

* Total Expenses
* My Spending
* Average Per Person
* Amount I Owe
* Amount Others Owe Me

### Room Information

* Room name
* Room code
* Number of members
* Current active members

### Spending Overview

Use lightweight charts:

* Spending by member
* Spending by category
* Spending over time

Avoid unnecessarily heavy animations or libraries.

### Recent Expenses

Display:

* Description
* Amount
* Paid by
* Category
* Date
* Edited indicator
* Split information

Provide:

"View All"

---

# 11. Member Comparison

Create a dedicated section showing spending comparison.

Example:

| Member | Spent | Average | Difference |
| ------ | ----- | ------- | ---------- |
| Alok   | ₹400  | ₹500    | -₹100      |
| Rahul  | ₹200  | ₹500    | -₹300      |
| Aman   | ₹600  | ₹500    | +₹100      |
| Rohit  | ₹800  | ₹500    | +₹300      |

Use visual indicators for:

* Below average
* Near average
* Above average

The UI should make this immediately understandable.

---

# 12. Settlement System

Create a "Settle Up" page.

Show:

### You owe

Rahul → ₹300

### You will receive

Aman → ₹100

### Suggested settlements

Rahul → Rohit ₹200
Rahul → Aman ₹100

Allow users to mark settlements as:

* Pending
* Paid
* Confirmed

Keep settlement history.

Do not modify the original expense records when a settlement is made.

---

# 13. Room Management

Room owners/admins should be able to:

* Create room
* Rename room
* Generate room code
* Regenerate room code if necessary
* Copy/share room code
* View members
* Remove members where authorized
* Manage room settings
* Archive room

Normal members should be able to:

* Join room
* Leave room
* View members
* View expenses
* Add expenses
* Edit their own expenses

Design a sensible authorization model.

---

# 14. Authentication

Implement proper JWT authentication.

Pages:

### Landing Page

First page users see.

### Login

* Email
* Password
* Remember session where appropriate
* Forgot password UI

### Register

* Name
* Email
* Password
* Confirm password

### Authentication

Use:

* Password hashing
* JWT access token
* Secure token handling
* Protected routes
* Authentication middleware
* Authorization checks

Never store plain-text passwords.

If implementing refresh tokens, use a secure approach.

---

# 15. Initial Loading Experience

When the website opens, show a lightweight branded loading/splash screen for approximately 1–2 seconds.

Display:

# RoomMates

Tagline:

"Split expenses. Stay organized. Live together better."

Use a subtle animation.

Keep the splash screen lightweight.

Do not make users wait unnecessarily if the application is already loaded.

---

# 16. Navigation

After login, provide a clean responsive navigation system.

Desktop:

* Dashboard
* My Rooms
* Expenses
* Settlements
* Members
* History
* Profile
* Settings

Mobile:

Use a responsive bottom navigation or hamburger menu.

Include:

* User profile/avatar
* Current room selector
* Notifications if implemented
* Logout

---

# 17. Pages

Create the following major pages:

### Public

* Landing
* Login
* Register
* Forgot Password
* Reset Password

### Authenticated

* Dashboard
* Rooms
* Create Room
* Join Room
* Room Details
* Expenses
* Add Expense
* Expense Details
* Edit Expense
* Settlement
* Members
* Expense History
* Profile
* Settings
* Notifications
* Help/About

Use protected routes for authenticated pages.

---

# 18. Room Selector

If a user belongs to multiple rooms, provide a room switcher.

Example:

Current Room:

🏠 Home

Dropdown:

* Home
* Office
* Trip
* Flat 2

When the room changes:

* Dashboard data changes
* Expenses change
* Members change
* Settlements change
* History changes

Never mix room data.

---

# 19. Expense History

Create a complete history page.

Filters:

* Date range
* Member
* Category
* Amount
* Edited
* Deleted
* Expense type

Sort:

* Newest
* Oldest
* Highest amount
* Lowest amount

Allow users to inspect an expense's revision history.

---

# 20. Notifications

Implement a basic notification system.

Examples:

"Rahul added an expense of ₹500."

"Your expense was edited."

"You joined Home Room."

"Rohit marked a settlement as paid."

"You have ₹300 pending to settle."

Notifications should be associated with the relevant room and user.

---

# 21. Search and Filtering

Implement useful search.

Users should be able to search expenses by:

* Description
* Member
* Category

Use pagination for large datasets.

Do not load thousands of expenses into the browser at once.

Use server-side pagination where appropriate.

---

# 22. Responsive Design

The website MUST be responsive.

Support:

* Desktop
* Laptop
* Tablet
* Mobile

Do not simply shrink the desktop UI.

Create proper mobile layouts.

Tables should become cards or horizontally scrollable components on small screens.

Forms should work comfortably on mobile.

---

# 23. UI / UX Design

Design should be:

* Modern
* Clean
* Professional
* Attractive
* Minimal
* Responsive
* Lightweight

Use a **light theme by default**.

Avoid excessive gradients, huge images, heavy animations, unnecessary shadows, and resource-intensive components.

Use:

* Cards
* Rounded corners
* Good spacing
* Clear typography
* Consistent buttons
* Meaningful icons
* Empty states
* Skeleton loaders
* Toast notifications
* Confirmation dialogs

Use animation only where it improves UX.

Prioritize performance.

---

# 24. Performance Requirements

This application should be lightweight.

Optimize:

* Bundle size
* API requests
* Database queries
* Images
* React rendering
* Component loading

Use:

* Lazy-loaded routes
* Pagination
* Debounced search
* MongoDB indexes
* Efficient queries
* Proper caching where useful

Do not introduce large libraries unless they provide real value.

The application should run smoothly on an average laptop and mobile device.

---

# 25. Error Handling

Implement professional error handling.

Examples:

Invalid login:

"Invalid email or password."

Invalid room code:

"Room not found. Please check the code."

Duplicate expense submission:

"Unable to create expense. Please try again."

Network error:

"Something went wrong. Please check your connection."

Expired JWT:

Redirect to login appropriately.

Backend should return consistent API error responses.

Frontend should display user-friendly messages rather than raw server errors.

---

# 26. Validation

Validate both frontend and backend.

Examples:

* Valid email
* Strong password
* Amount > 0
* Required expense description
* Valid room code
* Valid split amounts
* Split percentages must total 100%
* Custom split amounts must equal the expense total

Never rely only on frontend validation.

---

# 27. MongoDB Data Model

Design proper Mongoose schemas.

At minimum:

### User

Fields such as:

* name
* email
* passwordHash
* avatar
* createdAt
* updatedAt
* lastLogin

### Room

Fields such as:

* name
* code
* owner
* members
* status
* createdAt
* updatedAt

### Expense

Fields such as:

* roomId
* createdBy
* amount
* description
* category
* paidBy
* participants
* splitType
* splitDetails
* date
* notes
* isEdited
* isDeleted
* createdAt
* updatedAt

### ExpenseRevision

Fields:

* expenseId
* editedBy
* previousData
* newData
* changedFields
* createdAt

### Settlement

Fields:

* roomId
* payer
* receiver
* amount
* status
* createdAt
* paidAt
* confirmedAt

### Notification

Fields:

* userId
* roomId
* type
* message
* read
* createdAt

Create appropriate indexes.

---

# 28. Calculation Engine

Do not put complicated calculation logic directly inside React components.

Create a reusable backend calculation/service layer.

The calculation engine should calculate:

### Total Room Expense

Sum of all active expenses.

### Member Spending

Total amount paid by each member.

### Average Spending

Total room expenses / applicable member count.

### Difference

Individual spending - average.

### Settlement

Determine net balance for each member.

Positive balance:

Member should receive money.

Negative balance:

Member owes money.

Generate optimized settlement transactions.

Make this calculation engine independently testable.

---

# 29. Historical Accuracy

This is a critical requirement.

Do NOT destroy historical data when:

* A member joins
* A member leaves
* An expense is edited
* An expense is deleted
* A settlement occurs

The system should maintain an audit trail.

If membership changes, historical reports should remain logically consistent.

Consider storing membership timestamps such as:

* joinedAt
* leftAt

Then calculations can determine which members were applicable during a particular period/expense where necessary.

---

# 30. Real-Time Updates

If practical, implement real-time room updates using:

* Socket.IO

For example:

User A adds ₹500 expense.

Other members currently viewing the same room should receive the updated expense/dashboard without manually refreshing.

Real-time functionality should be implemented carefully and should not significantly increase complexity or resource usage.

If Socket.IO is not implemented initially, structure the backend so it can be added later.

---

# 31. Security

Implement:

* Password hashing
* JWT authentication
* Protected routes
* Role-based authorization
* Input validation
* MongoDB injection protection
* CORS configuration
* Rate limiting for authentication endpoints
* Secure HTTP headers
* Environment variables
* No secrets committed to Git
* Proper error responses without exposing sensitive server details

Never trust IDs, room codes, or permissions received from the frontend.

Every protected API must verify authorization on the backend.

---

# 32. API Architecture

Use a clean REST API structure.

Example:

`POST /api/auth/register`

`POST /api/auth/login`

`GET /api/auth/me`

`POST /api/rooms`

`POST /api/rooms/join`

`GET /api/rooms`

`GET /api/rooms/:roomId`

`PATCH /api/rooms/:roomId`

`DELETE /api/rooms/:roomId/members/:memberId`

`POST /api/rooms/:roomId/expenses`

`GET /api/rooms/:roomId/expenses`

`GET /api/expenses/:expenseId`

`PATCH /api/expenses/:expenseId`

`DELETE /api/expenses/:expenseId`

`GET /api/expenses/:expenseId/history`

`GET /api/rooms/:roomId/summary`

`GET /api/rooms/:roomId/settlements`

`POST /api/settlements`

`PATCH /api/settlements/:settlementId`

`GET /api/notifications`

Organize routes, controllers, services, models, middleware, and utilities cleanly.

---

# 33. Project Structure

Use a professional structure similar to:

```text
RoomMates/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
│
├── .env.example
├── .gitignore
└── README.md
```

Adjust the structure if you have a better professional architecture.

---

# 34. Seed / Demo Data

Provide an optional seed script that creates:

* Demo users
* Demo room
* Demo members
* Demo expenses
* Demo settlements

This will make it easy to test the application.

Do not hard-code demo data into production logic.

---

# 35. Testing

Add tests for the most important calculation logic.

At minimum test:

1. Average expense calculation
2. Individual spending calculation
3. Positive/negative balances
4. Settlement calculation
5. Equal split
6. Custom split
7. Percentage split
8. Expense editing
9. Expense history
10. Room membership changes
11. Authorization
12. Invalid split values

Calculation logic should have strong test coverage because financial calculations must be reliable.

---

# 36. Empty States

Design useful empty states.

Example:

No rooms:

"You haven't joined any rooms yet."

Button:

"Create Room"

No expenses:

"No expenses yet."

Button:

"Add First Expense"

No settlements:

"Everyone is settled up 🎉"

---

# 37. Accessibility

Implement basic accessibility:

* Semantic HTML
* Keyboard navigation
* Accessible buttons
* Labels for form fields
* Proper focus states
* Sufficient text contrast
* ARIA attributes where required

---

# 38. Deployment Readiness

Prepare the project so it can eventually be deployed.

Frontend can be deployed to a modern static hosting platform.

Backend can be deployed to a Node-compatible hosting platform.

MongoDB should use MongoDB Atlas or another managed MongoDB provider.

Use environment variables for:

* MongoDB URI
* JWT secret
* API URL
* Client URL
* Other secrets

Never expose private secrets in frontend code.

---

# 39. Important Product Rule

The application is primarily an **expense tracking and calculation system**.

Do not turn it into an unnecessarily complicated social network.

Prioritize:

1. Correct calculations
2. Data integrity
3. Authentication/security
4. Room management
5. Expense tracking
6. Expense history
7. Settlement
8. Excellent UX
9. Performance
10. Responsive design

---

# 40. Development Approach

Build the application in logical phases.

### Phase 1

Project setup and architecture.

### Phase 2

Authentication.

### Phase 3

Room creation and joining.

### Phase 4

Expense creation and database storage.

### Phase 5

Calculation engine.

### Phase 6

Dashboard.

### Phase 7

Expense editing/history.

### Phase 8

Settlement system.

### Phase 9

Notifications and optional real-time updates.

### Phase 10

Responsive UI and performance optimization.

### Phase 11

Security and validation.

### Phase 12

Testing.

### Phase 13

Documentation and deployment configuration.

Do not skip backend architecture just to create the frontend quickly.

---

# 41. Code Quality Rules

Write maintainable production-quality code.

Avoid:

* Duplicate code
* Giant React components
* Business logic inside UI components
* Hard-coded values
* Hard-coded room members
* Hard-coded calculations
* Plain-text passwords
* Exposing JWT secrets
* Unnecessary dependencies
* Unnecessary animations

Prefer:

* Reusable components
* Service layers
* Utility functions
* Clear naming
* Small focused functions
* Centralized API handling
* Consistent error handling
* Proper validation
* Comments only where they add value

---

# 42. UI Design Direction

The overall visual identity should communicate:

**Simple + Smart + Trustworthy + Modern**

Brand:

**RoomMates**

Suggested tagline:

**"Split expenses. Stay organized. Live together better."**

Use a clean light interface with a restrained color palette and strong visual hierarchy.

The dashboard should look similar in quality to a modern finance/productivity SaaS application, while remaining lightweight.

Do not copy another company's UI.

---

# 43. Final Acceptance Criteria

The project is considered complete only when a user can perform this complete workflow:

1. Open RoomMates.
2. See a lightweight splash screen.
3. Register.
4. Login using JWT authentication.
5. Create a room.
6. Receive a unique room code.
7. Share the code.
8. Another user registers/logs in.
9. Joins using the room code.
10. Multiple users join.
11. Users add expenses.
12. Expenses appear for all room members.
13. Dashboard calculates total spending.
14. Dashboard calculates average spending.
15. Dashboard compares every member against average.
16. System calculates balances.
17. System generates settlement suggestions.
18. User can edit their own expense.
19. Edited label appears.
20. Previous value remains available in history.
21. New value is used for calculations.
22. User cannot edit another user's expense.
23. User can create/join multiple rooms.
24. Switching rooms switches all relevant data.
25. Users can view expense history.
26. Users can settle payments.
27. Settlement history is preserved.
28. Application works on mobile and desktop.
29. Invalid operations show useful errors.
30. Application can be run locally using documented commands.

---

# 44. How You Should Respond While Building

Do not generate the entire project as one huge uncontrolled response.

First provide:

1. Final architecture
2. Database schema/design
3. API design
4. Frontend page/component architecture
5. Calculation algorithm
6. Authentication/security architecture
7. Development phases

Then implement the project **phase by phase**.

For each phase:

* Explain what is being implemented.
* Show the files being created/modified.
* Provide complete code.
* Explain important code briefly.
* Provide commands to run it.
* Check for common errors.
* Then proceed to the next phase.

Whenever you make an architectural decision, prioritize scalability, correctness, security, maintainability, and low resource consumption.

The final result should be a **fully functional MERN application**, not merely a UI prototype.
