# SkillBridge - Mentorship & Accountability Platform

SkillBridge is a MERN stack application that connects learners with mentors and helps learners stay accountable through goals and progress tracking.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Models & Relationships](#data-models--relationships)
3. [Authorization Logic](#authorization-logic)
4. [API Routes Reference](#api-routes-reference)
5. [Setup Instructions](#setup-instructions)
6. [Testing the Application](#testing-the-application)
7. [Phase 2: Accountability & Discipline Layer](#phase-2-accountability--discipline-layer)
8. [Phase 2 User Stories & Manual Testing Guide](#phase-2-user-stories--manual-testing-guide)

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
│   │   ├── progressController.js
│   │   └── weeklyCheckInController.js  # Phase 2
│   ├── middleware/
│   │   ├── auth.js            # JWT verification & role authorization
│   │   ├── errorHandler.js    # Centralized error handling
│   │   └── validate.js        # Input validation middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── MentorProfile.js
│   │   ├── MentorshipRequest.js
│   │   ├── Goal.js
│   │   ├── ProgressUpdate.js
│   │   ├── WeeklyCheckIn.js        # Phase 2
│   │   └── MentorshipStatusLog.js  # Phase 2
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── mentorProfileRoutes.js
│   │   ├── mentorshipRoutes.js
│   │   ├── goalRoutes.js
│   │   ├── progressRoutes.js
│   │   └── weeklyCheckInRoutes.js  # Phase 2
│   ├── services/
│   │   ├── inactivityService.js    # Phase 2 - Inactivity detection logic
│   │   └── scheduler.js            # Phase 2 - Automatic cron jobs
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

## Phase 2: Accountability & Discipline Layer

Phase 2 introduces system-enforced accountability with weekly check-ins, inactivity detection, and mentorship risk state management.

### New Data Models

#### WeeklyCheckIn Model
Weekly accountability check-ins submitted by learners for their goals.

```javascript
{
  goal: ObjectId,           // References Goal
  learner: ObjectId,        // References User (learner)
  mentorship: ObjectId,     // References MentorshipRequest
  weekStartDate: Date,      // Monday of the check-in week
  weekEndDate: Date,        // Sunday of the check-in week
  plannedTasks: [String],   // 1-10 tasks planned for the week
  completedTasks: [String], // 0-10 tasks completed
  blockers: String,         // Optional, max 500 chars
  submittedAt: Date,        // When the check-in was submitted
  isLate: Boolean,          // Auto-set if submitted after weekEndDate
  timestamps: true
}
```

**Key Features:**
- Unique constraint: One check-in per goal per week (compound index on `goal` + `weekStartDate`)
- Immutable after creation (no update/delete endpoints)
- Late submissions automatically marked
- Week boundaries calculated as Monday 00:00:00 to Sunday 23:59:59

#### MentorshipStatusLog Model
Audit trail for all mentorship status changes.

```javascript
{
  mentorship: ObjectId,     // References MentorshipRequest
  previousStatus: String,   // Status before change
  newStatus: String,        // Status after change
  reason: String,           // Required explanation, max 500 chars
  triggeredBy: 'system' | 'mentor',
  systemContext: {          // Additional data for system-triggered changes
    consecutiveMissedWeeks: Number,
    lastCheckInDate: Date
  },
  timestamp: Date
}
```

**Key Features:**
- No deletes - complete history preserved
- Tracks both system-automated and mentor-initiated changes
- Provides audit trail for accountability

### Updated MentorshipRequest Model

The status field now supports accountability states:

```javascript
{
  // ... existing fields ...
  status: 'pending' | 'active' | 'at-risk' | 'paused' | 'rejected',
  consecutiveMissedWeeks: Number  // Tracks inactivity (default: 0)
}
```

**Status Transitions:**
```
                    ┌──────────────┐
                    │   pending    │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              │              ▼
     ┌──────────┐          │       ┌──────────┐
     │ rejected │          │       │  active  │◄────────────┐
     └──────────┘          │       └────┬─────┘             │
                           │            │                   │
                           │    2 missed weeks              │
                           │    (system)                    │
                           │            │                   │
                           │            ▼                   │
                           │     ┌──────────┐     check-in  │
                           │     │ at-risk  │───submitted───┤
                           │     └────┬─────┘   (system)    │
                           │          │                     │
                           │   continued                    │
                           │   inactivity                   │
                           │   (system)                     │
                           │          │                     │
                           │          ▼                     │
                           │     ┌──────────┐    mentor     │
                           └────►│  paused  │───reactivates─┘
                                 └──────────┘
```

### Inactivity Detection Rules

| Consecutive Missed Weeks | Action |
|--------------------------|--------|
| 1 week | Warning (internal tracking) |
| 2 weeks | Status → `at-risk` (system) |
| 3+ weeks (if at-risk) | Status → `paused` (system) |

**Recovery:**
- Submitting a check-in resets `consecutiveMissedWeeks` to 0
- If at-risk, submitting a check-in restores status to `active`
- Only mentors can reactivate `paused` mentorships

### Phase 2 API Routes

#### Weekly Check-In Routes (`/api/check-ins`)

```
POST /api/check-ins/:goalId  (Learner only)
Body: {
  plannedTasks: ["Task 1", "Task 2"],  // Required, 1-10 items
  completedTasks: ["Done 1"],          // Optional, 0-10 items
  blockers: "Stuck on...",             // Optional
  weekStartDate: "2024-01-15"          // Optional, defaults to current week
}
Response: { success, data: WeeklyCheckIn, message }

GET /api/check-ins/my  (Learner only)
Response: { success, count, data: [WeeklyCheckIn] }

GET /api/check-ins/goal/:goalId  (Learner only)
Response: { success, count, data: [WeeklyCheckIn] }

GET /api/check-ins/timeline/:goalId  (Learner or Mentor)
Query: ?weeks=12  (optional, 1-52, default: 12)
Response: {
  success,
  data: {
    goal: { id, title, status, createdAt },
    timeline: [{
      weekStart, weekEnd,
      status: 'submitted' | 'late' | 'missed' | 'current',
      checkIn: { ... } | null
    }]
  }
}

GET /api/check-ins/mentee/:menteeId  (Mentor only)
Response: { success, count, data: [WeeklyCheckIn] }

GET /api/check-ins/mentee/:menteeId/summary  (Mentor only)
Query: ?weeks=12
Response: {
  success,
  data: {
    mentorship: { id, status, consecutiveMissedWeeks },
    learner: { id, name, email },
    weeks: [{ weekStart, weekEnd, status, checkIns }],
    stats: {
      totalWeeks, submittedWeeks, missedWeeks, lateSubmissions
    }
  }
}

GET /api/check-ins/mentee/:menteeId/goal/:goalId  (Mentor only)
Response: { success, count, data: [WeeklyCheckIn] }
```

#### Mentor Oversight Routes (`/api/mentorships`)

```
GET /api/mentorships/mentee/:menteeId/details  (Mentor only)
Query: ?weeks=12
Response: {
  success,
  data: {
    mentorship: { id, status, consecutiveMissedWeeks, createdAt },
    learner: { id, name, email },
    consistency: { totalWeeks, submittedWeeks, missedWeeks, lateSubmissions },
    statusHistory: [MentorshipStatusLog]  // Last 10 entries
  }
}

GET /api/mentorships/:id/history  (Mentor only)
Response: { success, count, data: [MentorshipStatusLog] }

PUT /api/mentorships/:id/pause  (Mentor only)
Body: { reason: "Learner unresponsive for 3 weeks" }  // Required
Response: { success, data: MentorshipRequest, message }

PUT /api/mentorships/:id/reactivate  (Mentor only)
Body: { reason: "Learner ready to resume" }  // Optional
Response: { success, data: MentorshipRequest, message }

PUT /api/mentorships/:id/flag  (Mentor only)
Body: { reason: "Missed scheduled meetings" }  // Required
Response: { success, data: MentorshipRequest, message }
```

**Note:** The `PUT /api/mentorships/:id` endpoint now uses `active` instead of `accepted`:
```
PUT /api/mentorships/:id  (Mentor only)
Body: { status: 'active' | 'rejected' }  // Changed from 'accepted'
```

### Phase 2 Authorization Matrix

| Route | Learner | Mentor | Notes |
|-------|---------|--------|-------|
| `POST /api/check-ins/:goalId` | Yes | No | Own goals only, not when paused |
| `GET /api/check-ins/my` | Yes | No | Own check-ins |
| `GET /api/check-ins/goal/:goalId` | Yes | No | Own goals |
| `GET /api/check-ins/timeline/:goalId` | Yes | Yes | With ownership check |
| `GET /api/check-ins/mentee/:id` | No | Yes | Own mentees only |
| `GET /api/check-ins/mentee/:id/summary` | No | Yes | Own mentees only |
| `GET /api/mentorships/:id/history` | No | Yes | Own mentorships |
| `PUT /api/mentorships/:id/pause` | No | Yes | Own mentorships |
| `PUT /api/mentorships/:id/reactivate` | No | Yes | Own paused mentorships |
| `PUT /api/mentorships/:id/flag` | No | Yes | Own active/at-risk |

### Phase 2 Business Rules

1. **One Check-In Per Goal Per Week**: Compound unique index prevents duplicates
2. **Immutable Check-Ins**: No update or delete operations available
3. **Automatic Late Marking**: System sets `isLate: true` if submitted after week ends
4. **Paused Mentorship Restrictions**: Learners cannot submit check-ins when paused
5. **System-Enforced Transitions**: `active → at-risk → paused` happen automatically
6. **Manual Reactivation Only**: Only mentors can restore `paused → active`
7. **Complete Audit Trail**: All status changes logged with reasons
8. **No Hard Deletes**: Check-ins and logs are never deleted

### Updated Project Structure

```
backend/
├── controllers/
│   ├── ...existing...
│   └── weeklyCheckInController.js  # NEW
├── models/
│   ├── ...existing...
│   ├── WeeklyCheckIn.js            # NEW
│   └── MentorshipStatusLog.js      # NEW
├── routes/
│   ├── ...existing (updated)...
│   └── weeklyCheckInRoutes.js      # NEW
├── services/
│   └── inactivityService.js        # NEW - Inactivity detection logic
└── ...
```

---

## Phase 2 User Stories & Manual Testing Guide

This section explains how the weekly check-in and inactivity system works from a user's perspective, with step-by-step instructions for manual testing.

### How the System Works - Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WEEKLY ACCOUNTABILITY CYCLE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   LEARNER                           SYSTEM                      MENTOR      │
│   ───────                           ──────                      ──────      │
│                                                                             │
│   Creates Goal ─────────────────────────────────────────────► Can view      │
│       │                                                                     │
│       ▼                                                                     │
│   Submits Weekly ──────► Resets inactivity                                  │
│   Check-in              counter to 0                                        │
│       │                      │                                              │
│       │                      ▼                                              │
│       │                 If was "at-risk" ──────────► Returns to "active"    │
│       │                                                                     │
│   ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│   MISSES Check-in ─────► System detects ─────► After 2 weeks:               │
│   (no submission             (Every Monday       Status → "at-risk"         │
│    for a week)                at 9 AM UTC)            │                     │
│                                                       ▼                     │
│                                                  After 3+ weeks             │
│                                                  (while at-risk):           │
│                                                  Status → "paused"          │
│                                                       │                     │
│                                                       ▼                     │
│   Cannot submit ◄──────────────────────────── Mentorship PAUSED             │
│   check-ins                                          │                      │
│                                                      ▼                      │
│                                              Mentor can ──────► Reactivate  │
│                                              review and          or keep    │
│                                              decide              paused     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Automatic Scheduler

The system runs an **automatic inactivity check every Monday at 9:00 AM UTC**. This is configured in `backend/services/scheduler.js` and starts automatically when the server boots.

**What the scheduler does:**
1. Scans all `active` and `at-risk` mentorships
2. Counts consecutive weeks without check-ins for each
3. Applies status transitions based on inactivity rules
4. Logs all changes to `MentorshipStatusLog`

---

### User Story 1: Learner Submits Weekly Check-in (Happy Path)

**As a learner, I want to submit my weekly check-in so my mentor can track my progress.**

#### Steps to Test:

1. **Login as a learner** who has an active mentorship and at least one active goal

2. **Submit a check-in** via API:
   ```bash
   curl -X POST http://localhost:5000/api/check-ins/YOUR_GOAL_ID \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_LEARNER_TOKEN" \
     -d '{
       "plannedTasks": ["Complete React tutorial", "Build todo app", "Review hooks"],
       "completedTasks": ["Read documentation"],
       "blockers": "None this week"
     }'
   ```

3. **Expected Response:**
   ```json
   {
     "success": true,
     "data": {
       "goal": "...",
       "weekStartDate": "2026-01-13T00:00:00.000Z",
       "weekEndDate": "2026-01-19T23:59:59.999Z",
       "plannedTasks": ["Complete React tutorial", "Build todo app", "Review hooks"],
       "completedTasks": ["Read documentation"],
       "blockers": "None this week",
       "isLate": false,
       "submittedAt": "2026-01-15T10:30:00.000Z"
     },
     "message": "Check-in submitted successfully"
   }
   ```

4. **What happens internally:**
   - Check-in record is created for the current week (Monday-Sunday)
   - `consecutiveMissedWeeks` on mentorship is reset to 0
   - If mentorship was `at-risk`, it returns to `active`

---

### User Story 2: Learner Tries to Submit Duplicate Check-in

**As a learner, I should not be able to submit multiple check-ins for the same goal in the same week.**

#### Steps to Test:

1. Submit a check-in (as in User Story 1)

2. **Try to submit again for the same goal:**
   ```bash
   curl -X POST http://localhost:5000/api/check-ins/YOUR_GOAL_ID \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_LEARNER_TOKEN" \
     -d '{
       "plannedTasks": ["Another task"]
     }'
   ```

3. **Expected Response:**
   ```json
   {
     "success": false,
     "error": "A check-in already exists for this goal and week"
   }
   ```

---

### User Story 3: System Detects Inactivity and Marks Mentorship "At-Risk"

**As a system, I want to automatically detect when a learner misses 2 consecutive weeks of check-ins and mark their mentorship as at-risk.**

#### How It Works:

1. **Week 1:** Learner misses check-in
   - `consecutiveMissedWeeks` = 1
   - Status remains `active`

2. **Week 2:** Learner misses check-in again
   - `consecutiveMissedWeeks` = 2
   - **System automatically changes status to `at-risk`**
   - Entry logged in `MentorshipStatusLog`:
     ```json
     {
       "previousStatus": "active",
       "newStatus": "at-risk",
       "reason": "Inactivity detected: 2 consecutive weeks without check-ins",
       "triggeredBy": "system"
     }
     ```

#### Manual Test (Simulate Inactivity):

```bash
# Run this script to simulate and test inactivity detection
cd backend && node -e "
const mongoose = require('mongoose');

async function simulateInactivity() {
  await mongoose.connect('YOUR_MONGODB_URI');

  // Load models
  require('./models/User');
  require('./models/MentorProfile');
  require('./models/Goal');
  require('./models/WeeklyCheckIn');
  require('./models/MentorshipStatusLog');
  const MentorshipRequest = require('./models/MentorshipRequest');
  const WeeklyCheckIn = require('./models/WeeklyCheckIn');
  const { processInactivityForMentorship } = require('./services/inactivityService');

  const mentorshipId = 'YOUR_MENTORSHIP_ID';

  // Delete any existing check-ins to simulate inactivity
  await WeeklyCheckIn.deleteMany({ mentorship: mentorshipId });
  console.log('Deleted check-ins to simulate inactivity');

  // Run inactivity processor
  const result = await processInactivityForMentorship(mentorshipId);
  console.log('After processing:');
  console.log('  Status:', result.status);
  console.log('  Missed weeks:', result.consecutiveMissedWeeks);

  await mongoose.disconnect();
}
simulateInactivity();
"
```

---

### User Story 4: System Pauses Mentorship After Continued Inactivity

**As a system, I want to automatically pause a mentorship if a learner continues to be inactive while at-risk.**

#### How It Works:

1. Mentorship is already `at-risk`
2. **Week 3:** Learner still misses check-in
   - `consecutiveMissedWeeks` = 3
   - **System automatically changes status to `paused`**
   - Entry logged:
     ```json
     {
       "previousStatus": "at-risk",
       "newStatus": "paused",
       "reason": "Continued inactivity: 3 consecutive weeks without check-ins",
       "triggeredBy": "system"
     }
     ```

3. **Learner impact:**
   - Cannot submit new check-ins (blocked by system)
   - Must wait for mentor to reactivate

---

### User Story 5: Learner Tries to Submit Check-in While Paused

**As a learner with a paused mentorship, I should not be able to submit check-ins until my mentor reactivates the mentorship.**

#### Steps to Test:

1. Ensure mentorship status is `paused`

2. **Try to submit check-in:**
   ```bash
   curl -X POST http://localhost:5000/api/check-ins/YOUR_GOAL_ID \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_LEARNER_TOKEN" \
     -d '{
       "plannedTasks": ["I want to resume"]
     }'
   ```

3. **Expected Response:**
   ```json
   {
     "success": false,
     "error": "Cannot submit check-in while mentorship is paused"
   }
   ```

---

### User Story 6: Mentor Reactivates Paused Mentorship

**As a mentor, I want to reactivate a paused mentorship when my mentee is ready to resume.**

#### Steps to Test:

1. **Login as the mentor**

2. **Reactivate the mentorship:**
   ```bash
   curl -X PUT http://localhost:5000/api/mentorships/MENTORSHIP_ID/reactivate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_MENTOR_TOKEN" \
     -d '{
       "reason": "Learner contacted me and is ready to resume"
     }'
   ```

3. **Expected Response:**
   ```json
   {
     "success": true,
     "data": {
       "status": "active",
       "consecutiveMissedWeeks": 0
     },
     "message": "Mentorship reactivated successfully"
   }
   ```

4. **What happens:**
   - Status changes from `paused` to `active`
   - `consecutiveMissedWeeks` resets to 0
   - Learner can now submit check-ins again
   - Change logged in `MentorshipStatusLog`

---

### User Story 7: Learner Recovers from At-Risk by Submitting Check-in

**As a learner with an at-risk mentorship, I want my status to return to active when I submit a check-in.**

#### Steps to Test:

1. Ensure mentorship is `at-risk` (not paused)

2. **Submit a check-in:**
   ```bash
   curl -X POST http://localhost:5000/api/check-ins/YOUR_GOAL_ID \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_LEARNER_TOKEN" \
     -d '{
       "plannedTasks": ["Back on track", "Complete pending work"]
     }'
   ```

3. **Expected behavior:**
   - Check-in is saved
   - Mentorship status automatically changes from `at-risk` to `active`
   - `consecutiveMissedWeeks` resets to 0
   - System logs the recovery:
     ```json
     {
       "previousStatus": "at-risk",
       "newStatus": "active",
       "reason": "Check-in submitted, inactivity counter reset",
       "triggeredBy": "system"
     }
     ```

---

### User Story 8: Mentor Views Mentee Consistency Summary

**As a mentor, I want to see my mentee's check-in history and consistency stats.**

#### Steps to Test:

1. **Get consistency summary:**
   ```bash
   curl http://localhost:5000/api/check-ins/mentee/MENTEE_USER_ID/summary?weeks=12 \
     -H "Authorization: Bearer YOUR_MENTOR_TOKEN"
   ```

2. **Expected Response:**
   ```json
   {
     "success": true,
     "data": {
       "mentorship": {
         "id": "...",
         "status": "active",
         "consecutiveMissedWeeks": 0
       },
       "learner": {
         "name": "Jane Learner",
         "email": "learner@test.com"
       },
       "weeks": [
         {
           "weekStart": "2026-01-13",
           "weekEnd": "2026-01-19",
           "status": "submitted",
           "checkIns": [...]
         },
         {
           "weekStart": "2026-01-06",
           "weekEnd": "2026-01-12",
           "status": "missed",
           "checkIns": []
         }
       ],
       "stats": {
         "totalWeeks": 12,
         "submittedWeeks": 8,
         "missedWeeks": 4,
         "lateSubmissions": 1
       }
     }
   }
   ```

---

### User Story 9: Mentor Manually Pauses Mentorship

**As a mentor, I want to pause a mentorship manually if my mentee is unresponsive or needs a break.**

#### Steps to Test:

1. **Pause the mentorship:**
   ```bash
   curl -X PUT http://localhost:5000/api/mentorships/MENTORSHIP_ID/pause \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_MENTOR_TOKEN" \
     -d '{
       "reason": "Learner requested a 2-week break for exams"
     }'
   ```

2. **Expected Response:**
   ```json
   {
     "success": true,
     "data": {
       "status": "paused"
     },
     "message": "Mentorship paused successfully"
   }
   ```

---

### User Story 10: Mentor Flags Poor Commitment

**As a mentor, I want to flag a mentee for poor commitment, which moves them to at-risk status.**

#### Steps to Test:

1. **Flag the mentorship:**
   ```bash
   curl -X PUT http://localhost:5000/api/mentorships/MENTORSHIP_ID/flag \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_MENTOR_TOKEN" \
     -d '{
       "reason": "Mentee has missed 3 scheduled meetings"
     }'
   ```

2. **Expected behavior:**
   - If status was `active`, changes to `at-risk`
   - If already `at-risk`, just logs the flag
   - Cannot flag `paused` mentorships

---

### Quick Reference: Status Transition Table

| Current Status | Trigger | New Status | Who/What |
|----------------|---------|------------|----------|
| `active` | 2 missed weeks | `at-risk` | System (automatic) |
| `active` | Mentor flags | `at-risk` | Mentor (manual) |
| `active` | Mentor pauses | `paused` | Mentor (manual) |
| `at-risk` | Check-in submitted | `active` | System (automatic) |
| `at-risk` | 3+ missed weeks | `paused` | System (automatic) |
| `at-risk` | Mentor pauses | `paused` | Mentor (manual) |
| `paused` | Mentor reactivates | `active` | Mentor (manual) |

---

### When Does the System Check for Inactivity?

| Event | Timing | Action |
|-------|--------|--------|
| **Scheduled Check** | Every Monday 9:00 AM UTC | Scans all active/at-risk mentorships |
| **On Check-in** | Immediately | Resets counter, may restore to active |
| **Mentor Actions** | Immediately | Pause/reactivate/flag |

**Server startup log confirms scheduler:**
```
Server running on port 5000
MongoDB Connected: ...
Initializing scheduler...
Scheduler initialized:
  - Inactivity check: Every Monday at 9:00 AM UTC
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

