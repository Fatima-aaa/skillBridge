# SkillBridge - Mentorship & Accountability Platform

SkillBridge is a MERN stack application that connects learners with mentors and helps learners stay accountable through goals and progress tracking.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Models & Relationships](#data-models--relationships)
3. [Authorization Logic](#authorization-logic)
4. [API Routes Reference](#api-routes-reference)
5. [Setup Instructions](#setup-instructions)
6. [Testing the Application](#testing-the-application)

---

## Architecture Overview

### Tech Stack
- **Backend**: Node.js, Express.js, MongoDB (Mongoose)
- **Frontend**: React (Vite), React Router, Axios
- **Authentication**: JWT (JSON Web Tokens)

### Project Structure

```
skillBridge/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js       # Auth logic
│   │   ├── mentorProfileController.js
│   │   ├── mentorshipController.js
│   │   ├── goalController.js
│   │   └── progressController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT verification & role authorization
│   │   ├── errorHandler.js    # Centralized error handling
│   │   └── validate.js        # Input validation middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── MentorProfile.js
│   │   ├── MentorshipRequest.js
│   │   ├── Goal.js
│   │   └── ProgressUpdate.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── mentorProfileRoutes.js
│   │   ├── mentorshipRoutes.js
│   │   ├── goalRoutes.js
│   │   └── progressRoutes.js
│   ├── utils/
│   │   ├── AppError.js        # Custom error class
│   │   └── asyncHandler.js    # Async/await error wrapper
│   └── server.js              # Express app entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   └── ...
└── README.md
```

---

## Data Models & Relationships

### 1. User Model
The base authentication model for all users.

```javascript
{
  name: String,           // Required, max 50 chars
  email: String,          // Required, unique, validated
  password: String,       // Required, min 6 chars, hashed with bcrypt
  role: 'learner' | 'mentor',  // Required
  timestamps: true
}
```

**Key Features:**
- Password is automatically hashed before saving using bcrypt
- Includes method to compare passwords and generate JWT tokens
- Password field excluded from queries by default (`select: false`)

### 2. MentorProfile Model
Extended profile information for mentors.

```javascript
{
  user: ObjectId,         // References User, unique (1:1 relationship)
  skills: [String],       // Required, at least one skill
  bio: String,            // Optional, max 500 chars
  capacity: Number,       // Required, 1-20 mentees max
  currentMenteeCount: Number,  // Auto-tracked
  timestamps: true
}
```

**Key Features:**
- One-to-one relationship with User (mentor)
- Virtual `isAvailable` property computed from capacity vs currentMenteeCount
- Skills are indexed for efficient filtering

### 3. MentorshipRequest Model
Tracks mentorship connections between learners and mentors.

```javascript
{
  learner: ObjectId,      // References User (learner)
  mentor: ObjectId,       // References User (mentor)
  status: 'pending' | 'accepted' | 'rejected',
  message: String,        // Optional request message, max 300 chars
  timestamps: true
}
```

**Key Features:**
- Compound index prevents duplicate pending requests
- Status transitions: pending → accepted/rejected (one-way)
- A learner can only have ONE active (accepted) mentorship

### 4. Goal Model
Learning goals created by learners within their mentorship.

```javascript
{
  mentorship: ObjectId,   // References MentorshipRequest
  learner: ObjectId,      // References User (learner) - denormalized for queries
  title: String,          // Required, max 100 chars
  description: String,    // Required, max 500 chars
  status: 'active' | 'completed',
  timestamps: true
}
```

**Key Features:**
- Goals belong to a specific mentorship relationship
- Learner reference is denormalized for efficient queries
- Only learners with active mentorships can create goals

### 5. ProgressUpdate Model
Progress reports for goals.

```javascript
{
  goal: ObjectId,         // References Goal
  learner: ObjectId,      // References User (learner)
  content: String,        // Required, max 1000 chars
  timestamps: true
}
```

**Key Features:**
- Multiple updates per goal (append-only log)
- Indexed by goal and creation time for efficient retrieval

### Entity Relationship Diagram

```
User (1) ─────────────── (0..1) MentorProfile
  │                              (mentor only)
  │
  ├── as Learner ───────── (*) MentorshipRequest
  │                              │
  ├── as Mentor ────────── (*) MentorshipRequest
  │                              │
  │                              └── (1) ─── (*) Goal
  │                                           │
  │                                           └── (*) ProgressUpdate
  └── (denormalized refs in Goal, ProgressUpdate)
```

---

## Authorization Logic

### Role-Based Access Control (RBAC)

The application implements two-level authorization:

1. **Authentication** (`protect` middleware): Verifies JWT token
2. **Authorization** (`authorize` middleware): Checks user role

### Route Protection Matrix

| Route | Learner | Mentor | Notes |
|-------|---------|--------|-------|
| `POST /api/auth/register` | Yes | Yes | Public |
| `POST /api/auth/login` | Yes | Yes | Public |
| `GET /api/auth/me` | Yes | Yes | Authenticated |
| `GET /api/mentor-profiles` | Yes | Yes | View all mentors |
| `POST /api/mentor-profiles` | No | Yes | Create own profile |
| `PUT /api/mentor-profiles` | No | Yes | Update own profile |
| `POST /api/mentorships` | Yes | No | Send request |
| `GET /api/mentorships/requests` | No | Yes | View incoming |
| `PUT /api/mentorships/:id` | No | Yes | Accept/reject |
| `POST /api/goals` | Yes | No | Must have active mentorship |
| `GET /api/goals/mentee/:id` | No | Yes | Only own mentees |
| `POST /api/progress/:goalId` | Yes | No | Own goals only |
| `GET /api/progress/:goalId` | Yes | Yes | With ownership check |

### Ownership Checks

Beyond role-based access, the application enforces ownership:

1. **Learners can only:**
   - Create goals for their own active mentorship
   - Update their own goals
   - Submit progress for their own goals
   - View their own requests and goals

2. **Mentors can only:**
   - Update their own profile
   - Accept/reject requests sent to them
   - View goals of their accepted mentees

### Business Rules Enforced

1. **Single Active Mentorship**: A learner can have only one accepted mentorship at a time
2. **Capacity Limits**: Mentors cannot accept more mentees than their capacity
3. **Goals Require Mentorship**: Learners cannot create goals without an active mentorship
4. **Request Deduplication**: Cannot send duplicate pending requests to the same mentor

---

## API Routes Reference

### Authentication Routes

```
POST /api/auth/register
Body: { name, email, password, role }
Response: { success, token, data: { id, name, email, role } }

POST /api/auth/login
Body: { email, password }
Response: { success, token, data: { id, name, email, role } }

GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: { success, data: User }
```

### Mentor Profile Routes

```
GET /api/mentor-profiles
Response: { success, count, data: [MentorProfile] }

GET /api/mentor-profiles/:id
Response: { success, data: MentorProfile }

GET /api/mentor-profiles/me  (Mentor only)
Response: { success, data: MentorProfile }

POST /api/mentor-profiles  (Mentor only)
Body: { skills: [], bio, capacity }
Response: { success, data: MentorProfile }

PUT /api/mentor-profiles  (Mentor only)
Body: { skills?, bio?, capacity? }
Response: { success, data: MentorProfile }
```

### Mentorship Routes

```
POST /api/mentorships  (Learner only)
Body: { mentorId, message? }
Response: { success, data: MentorshipRequest }

GET /api/mentorships/my-requests  (Learner only)
Response: { success, count, data: [MentorshipRequest] }

GET /api/mentorships/active  (Learner only)
Response: { success, data: MentorshipRequest | null }

GET /api/mentorships/requests  (Mentor only)
Response: { success, count, data: [MentorshipRequest] }

GET /api/mentorships/mentees  (Mentor only)
Response: { success, count, data: [MentorshipRequest] }

PUT /api/mentorships/:id  (Mentor only)
Body: { status: 'accepted' | 'rejected' }
Response: { success, data: MentorshipRequest }
```

### Goal Routes

```
POST /api/goals  (Learner only, requires active mentorship)
Body: { title, description }
Response: { success, data: Goal }

GET /api/goals  (Learner only)
Response: { success, count, data: [Goal] }

GET /api/goals/:id
Response: { success, data: Goal }

PUT /api/goals/:id  (Learner only, own goals)
Body: { status: 'active' | 'completed' }
Response: { success, data: Goal }

GET /api/goals/mentee/:menteeId  (Mentor only, own mentees)
Response: { success, count, data: [Goal] }
```

### Progress Routes

```
POST /api/progress/:goalId  (Learner only, own goals)
Body: { content }
Response: { success, data: ProgressUpdate }

GET /api/progress/:goalId
Response: { success, count, data: [ProgressUpdate] }
```

---

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)
- MongoDB Atlas account (free tier works)

### Step 1: Clone or Navigate to the Project

```bash
cd C:\Users\myPC\Desktop\skillBridge
```

### Step 2: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in or create a free account

2. Create a new cluster (free tier M0 is fine)

3. Once cluster is created, click **"Connect"**

4. Choose **"Connect your application"**

5. Copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

6. **Important**:
   - Replace `<username>` with your database username
   - Replace `<password>` with your database password
   - Add your database name before the `?`: `.../skillbridge?retryWrites=true...`

7. **Allow network access**:
   - Go to "Network Access" in Atlas sidebar
   - Click "Add IP Address"
   - Either add your current IP or click "Allow Access from Anywhere" (0.0.0.0/0) for development

### Step 3: Configure Backend Environment Variables

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Create a `.env` file (copy from the example):
   ```bash
   copy .env.example .env
   ```

3. Edit the `.env` file with your values:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://yourUsername:yourPassword@cluster0.xxxxx.mongodb.net/skillbridge?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_key_make_it_long_and_random
   JWT_EXPIRE=7d
   ```

   **Important**:
   - Replace the MONGODB_URI with YOUR actual connection string
   - Change JWT_SECRET to a random string (at least 32 characters)

### Step 4: Install Dependencies

Install backend dependencies:
```bash
cd backend
npm install
```

Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### Step 5: Start the Application

**Option A: Run both separately (recommended for development)**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

**Option B: Manual start**

Backend (from `backend` folder):
```bash
npm start
```

Frontend (from `frontend` folder):
```bash
npm run dev
```

### Step 6: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **API Health Check**: http://localhost:5000/api/health

---

## Testing the Application

### Test Flow 1: Register as Mentor and Create Profile

1. Open http://localhost:3000
2. Click "Register"
3. Fill in:
   - Name: "John Mentor"
   - Email: "mentor@test.com"
   - Password: "password123"
   - Role: "Mentor"
4. After registration, you'll see the Mentor Dashboard
5. Create your profile:
   - Skills: "JavaScript, React, Node.js"
   - Bio: "Senior developer with 5 years experience"
   - Capacity: 5
6. Click "Create Profile"

### Test Flow 2: Register as Learner and Request Mentorship

1. Open a new incognito/private browser window
2. Go to http://localhost:3000
3. Register as:
   - Name: "Jane Learner"
   - Email: "learner@test.com"
   - Password: "password123"
   - Role: "Learner"
4. Click "Find Mentors" in navbar
5. Click "View Profile" on the mentor you created
6. Send a mentorship request with a message
7. Return to Dashboard to see your pending request

### Test Flow 3: Accept Mentorship and Create Goals

1. Go back to mentor's browser window (or login as mentor)
2. You should see the incoming request
3. Click "Accept"
4. Go to learner's browser window
5. Refresh or click Dashboard
6. You should now see "Active Mentorship"
7. Click "My Goals" or "Manage Goals"
8. Create a new goal:
   - Title: "Learn React Hooks"
   - Description: "Master useState, useEffect, useContext, and custom hooks"
9. Click on the goal to view details
10. Add a progress update: "Completed useState tutorial"

### Test Flow 4: Mentor Views Mentee Progress

1. Go to mentor's browser window
2. Click "View Goals" on the mentee card
3. You can see all the mentee's goals and progress updates

### Testing with API Directly (using curl or Postman)

```bash
# Health Check
curl http://localhost:5000/api/health

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"password123","role":"learner"}'

# Login (save the token!)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Get mentors (use token from login)
curl http://localhost:5000/api/mentor-profiles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Common Issues & Troubleshooting

### "Cannot connect to MongoDB"
- Check your MONGODB_URI in `.env`
- Ensure your IP is whitelisted in MongoDB Atlas Network Access
- Verify your username and password are correct

### "CORS errors in browser"
- Make sure both backend (port 5000) and frontend (port 3000) are running
- The Vite proxy should handle API requests

### "JWT token errors"
- Ensure JWT_SECRET is set in `.env`
- Clear localStorage and login again

### "Port already in use"
- Kill the process using the port or change PORT in `.env`
- On Windows: `netstat -ano | findstr :5000` then `taskkill /PID <PID> /F`

---

## License

This project is for educational/MVP purposes.
