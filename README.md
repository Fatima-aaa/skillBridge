# SkillBridge

SkillBridge connects learners with mentors and helps you stay on track with your learning goals.

---

## What Can You Do?

### As a Learner

**Find a Mentor**
- Browse available mentors sorted by rating, experience, or trust score
- View mentor profiles with their skills, bio, and reputation stats
- See how many spots each mentor has available
- Send a mentorship request with a personal message
- You can only have one active mentor at a time

**Work with Your Mentor**
- Once your mentor accepts, they can create learning goals for you
- View your goals and their status (active, completed)
- Post progress updates on your goals
- Your mentor tracks your progress and can mark goals complete

**Stay Accountable**
- Submit weekly check-ins for each goal (what you planned, what you did, any blockers)
- If you miss check-ins for 2 weeks, your mentorship goes to "at-risk" status
- Miss 3 weeks and your mentorship gets paused until your mentor reactivates it
- Submitting a check-in brings you back to good standing

**Complete Your Mentorship**
- When you've achieved your goals, you can mark the mentorship as complete
- You can only complete a mentorship when it's in "active" status (not at-risk or paused)
- After completion, you can rate your mentor (1-5 stars, anonymous)
- Your check-in consistency affects your reliability score that future mentors can see

### As a Mentor

**Create Your Profile**
- Set up your profile with your skills, bio, and how many learners you can take
- Your profile is visible to all learners looking for mentors
- Your reputation builds over time based on learner reviews

**Manage Mentorship Requests**
- See incoming requests from learners
- View learner reliability scores and warnings before accepting (see Reliability Score section below)
- Accept or reject requests based on your availability

**Track Your Mentees**
- See all your active mentees on your dashboard
- Create and manage goals for each mentee
- View their progress updates and weekly check-ins
- Check their consistency stats and mentorship status history

**Handle Inactive Learners**
- The system automatically flags learners who miss check-ins
- Mentorships go to "at-risk" after 2 missed weeks, "paused" after 3
- You can manually reactivate paused mentorships
- You can flag learners for poor commitment (moves them to at-risk)

**Give Feedback**
- After a mentorship ends, rate your learner (1-5 stars)
- Your rating is anonymous - learners see aggregate scores only
- Your feedback contributes to their reliability score for future mentors

**Build Your Reputation**
- Learners can rate you after mentorship ends (1-5 stars)
- Your average rating is visible on your profile
- Higher ratings and more completed mentorships improve your visibility

---

## Scoring Systems

### Learner Reliability Score (0-100)

When a learner sends you a mentorship request, you see their reliability score calculated from their history:

**Components:**

| Component | Points | How It's Calculated |
|-----------|--------|---------------------|
| Mentor Feedback | 0-40 | `(averageRating / 5) * 40` |
| Check-in Consistency | 0-30 | `(weeksWithCheckIns / totalWeeks) * 30` |
| Completion History | 0-30 | `(completionRate / 100) * 20 + stickWithItBonus` |

**Stick-with-it Bonus:** Up to 10 extra points for not ending mentorships early
```
stickWithItBonus = ((100 - earlyTerminationRate) / 100) * 10
```

**Risk Levels:**
| Score | Risk Level | Display Color |
|-------|------------|---------------|
| 70-100 | Low | Green |
| 50-69 | Medium | Yellow |
| 0-49 | High | Red |

**Warning Messages:**

Mentors see warnings when:
| Warning | Triggered When |
|---------|----------------|
| "This learner has a low reliability score" | Score below 50 |
| "This learner has ended mentorships early in the past" | Early termination rate > 30% |
| "This learner has inconsistent check-in history" | Check-in consistency < 50% |
| "Previous mentors have reported concerns" | Average rating < 2.5 |

**Notes:**
- New learners show "New learner - no history yet"
- Score only calculates when there's enough data (at least 1 feedback OR 4 weeks of check-in history)
- Default values (neutral) are used for missing components

### Mentor Reputation Score

Mentor profiles display:

| Metric | Description |
|--------|-------------|
| Average Rating | Mean of all learner ratings (1-5 stars) |
| Review Count | Total number of ratings received |
| Completed Mentorships | Number of successfully completed mentorships |
| Experience Level | Based on completed count: new, beginner, intermediate, experienced, expert |
| Trust Score | Weighted score (0-100) combining rating, completion rate, and experience |

**Trust Score Calculation:**
```
Trust Score = ratingScore + completionScore + experienceScore

ratingScore = (averageRating / 5) * 50        // 0-50 points
completionScore = (completionRate / 100) * 30  // 0-30 points
experienceScore = min(completedMentorships * 2, 20)  // 0-20 points
```

**Experience Levels:**
| Completed Mentorships | Level |
|-----------------------|-------|
| 0 | New |
| 1-2 | Beginner |
| 3-9 | Intermediate |
| 10-24 | Experienced |
| 25+ | Expert |

---

## How to Navigate the App

### Learner Navigation

| Menu Item | What It Does |
|-----------|--------------|
| Dashboard | See your active mentorship, goals, pending requests, and submit check-ins |
| Find Mentors | Browse all available mentors, view their profiles and ratings |
| My Goals | View your learning goals and add progress updates |

### Mentor Navigation

| Menu Item | What It Does |
|-----------|--------------|
| Dashboard | See incoming requests with learner reliability, manage mentees, rate completed learners |

### Pages

- **Login** - Sign in to your account
- **Register** - Create a new account (choose learner or mentor role)
- **Mentor Profile** - View a mentor's details, skills, ratings, and send requests
- **Mentee Goals** - (Mentor view) See and manage a specific mentee's goals

---

## Mentorship Status Flow

```
pending -> active -> at-risk -> paused -> completed
              |         |         |
              |         |         +-> (mentor reactivates) -> active
              |         |
              |         +-> (learner submits check-in) -> active
              |
              +-> (learner completes) -> completed
```

**Status Descriptions:**
| Status | Meaning |
|--------|---------|
| pending | Request sent, waiting for mentor to accept/reject |
| active | Mentorship is active and in good standing |
| at-risk | Learner missed 2 consecutive weeks of check-ins |
| paused | Learner missed 3+ weeks, mentorship frozen until reactivated |
| completed | Mentorship ended successfully |
| rejected | Mentor declined the request |

---

## Getting Started

### What You Need
- Node.js (version 18 or higher)
- A MongoDB database (MongoDB Atlas free tier works)

### Setup Steps

1. **Set up the backend**
   ```
   cd backend
   copy .env.example .env
   ```
   Edit `.env` with your MongoDB connection string and a secret key for JWT.

2. **Install everything**
   ```
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. **Run the app**

   Open two terminals:

   Terminal 1 (Backend):
   ```
   cd backend
   npm run dev
   ```

   Terminal 2 (Frontend):
   ```
   cd frontend
   npm run dev
   ```

4. **Open the app**
   - Go to http://localhost:3000 in your browser
   - Register a new account and start using SkillBridge

---

## Quick Test

1. Register as a mentor, create your profile with skills
2. In a different browser (or incognito), register as a learner
3. As the learner, find the mentor and send a request
4. As the mentor, accept the request (you'll see "New learner - no history")
5. As the mentor, create a goal for the learner
6. As the learner, submit weekly check-ins and progress updates
7. As the learner, complete the mentorship and rate the mentor
8. As the mentor, rate the learner
9. Send another request - now you'll see the learner's reliability score

---

## Automated Features

**Weekly Inactivity Check (Mondays 9:00 AM UTC)**
- System checks all active mentorships for missed check-ins
- Moves inactive mentorships to at-risk or paused status
- Logs all status changes for mentor visibility

**Real-time Inactivity Detection**
- When learner loads their dashboard, system checks for missed weeks
- Status updates immediately if check-ins are overdue

---

## Troubleshooting

**Can't connect to database?**
- Check your MongoDB URI in the `.env` file
- Make sure your IP is allowed in MongoDB Atlas Network Access

**Getting CORS errors?**
- Make sure both backend (port 5000) and frontend (port 3000) are running

**Token errors?**
- Clear your browser's localStorage and log in again

**Mentors not loading?**
- Check browser console for errors
- Verify backend is running on port 5000

**Dashboard not loading data?**
- Check that you're logged in with the correct role
- Refresh the page or clear localStorage and log in again

---

## Admin Panel (New)

SkillBridge includes a separate admin panel for platform management and moderation.

### Admin Authentication

- Admins have a separate login endpoint (`/api/admin/auth/login`)
- Only users with the `admin` role can authenticate
- All admin logins are logged for security

### User Moderation

**View Users**
- Browse all learners and mentors with pagination
- Filter by role (learner/mentor) or status (active/suspended)
- Search users by name or email
- View detailed user activity summaries

**Suspend/Reinstate Users**
- Suspend users who violate platform rules (requires reason)
- Reinstate suspended users (requires reason)
- All suspension/reinstatement actions are logged

### Mentorship Dispute Resolution

**View Mentorships**
- Browse all mentorships with status filtering
- View complete mentorship details including:
  - Goals and progress updates
  - Weekly check-ins
  - Reviews and feedback
  - Status change history

**Admin Actions**
- Pause active/at-risk mentorships (dispute resolution)
- Mark mentorships as completed (dispute resolution)
- All actions require a reason and are logged

### Platform Monitoring

**Statistics Dashboard**
- Total users (learners, mentors, active, suspended)
- Mentorship counts by status (pending, active, at-risk, paused, completed, rejected)

### Audit Logging

All admin actions are immutably logged with:
- Admin who performed the action
- Action type and target
- Reason provided
- IP address and user agent
- Timestamp

**Queryable Logs**
- Filter by admin, action type, target type, date range
- View recent activity summary (last 24 hours)
- Track audit history for specific users or mentorships

### Admin API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/auth/login` | POST | Admin login |
| `/api/admin/auth/me` | GET | Get admin profile |
| `/api/admin/users` | GET | List all users |
| `/api/admin/users/:id` | GET | Get user details |
| `/api/admin/users/:id/activity` | GET | Get user activity summary |
| `/api/admin/users/:id/suspend` | PUT | Suspend a user |
| `/api/admin/users/:id/reinstate` | PUT | Reinstate a user |
| `/api/admin/mentorships` | GET | List all mentorships |
| `/api/admin/mentorships/:id` | GET | Get mentorship details |
| `/api/admin/mentorships/:id/pause` | PUT | Pause a mentorship |
| `/api/admin/mentorships/:id/complete` | PUT | Complete a mentorship |
| `/api/admin/platform/stats` | GET | Get platform statistics |
| `/api/admin/audit-logs` | GET | Query audit logs |
| `/api/admin/audit-logs/recent` | GET | Get recent activity |

---

## Phase 5: Performance & Production Readiness

This phase adds database optimizations, pagination, input validation, and environment configuration for production deployment.

### Environment Setup

SkillBridge supports three environments: **development**, **staging**, and **production**.

#### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Environment: development | staging | production
NODE_ENV=development

# Server
PORT=5000
HOST=0.0.0.0

# Database (required)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/skillbridge

# JWT Authentication (required)
JWT_SECRET=your_secure_secret_key_min_32_chars
JWT_EXPIRE=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX=100             # requests per window

# Pagination
PAGINATION_DEFAULT_LIMIT=20
PAGINATION_MAX_LIMIT=100

# CORS (set to frontend URL in production)
CORS_ORIGIN=*
CORS_CREDENTIALS=false

# Scheduler
SCHEDULER_ENABLED=true
INACTIVITY_CHECK_CRON=0 9 * * 1
```

#### Environment-Specific Configuration

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| `NODE_ENV` | development | staging | production |
| `CORS_ORIGIN` | * | staging-url | production-url |
| `JWT_SECRET` | any | unique | unique & secure |
| `LOG_LEVEL` | debug | info | error |

### Deployment Steps

#### Prerequisites
- Node.js 18+
- MongoDB 6.0+ (Atlas recommended)
- PM2 or similar process manager (production)

#### Development
```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

#### Production

1. **Configure environment**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with production values
   # IMPORTANT: Change JWT_SECRET!
   ```

2. **Install dependencies**
   ```bash
   npm install --production
   ```

3. **Build frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

4. **Start with PM2**
   ```bash
   pm2 start server.js --name skillbridge
   pm2 save
   ```

5. **Reverse proxy (nginx example)**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location / {
           root /path/to/frontend/dist;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

### Security Enhancements

| Feature | Description |
|---------|-------------|
| Input Validation | All inputs validated with express-validator |
| Body Size Limit | JSON body limited to 10KB |
| Environment Validation | Required vars checked at startup |
| Production JWT Check | Prevents default JWT secret in production |
| CORS Configuration | Configurable origin restrictions |

### Performance Optimizations

#### Database Indexes

Indexes added to optimize common query patterns:

| Collection | Index | Purpose | Expected Improvement |
|------------|-------|---------|---------------------|
| **User** | `{ role: 1, status: 1 }` | Admin user listing | 50-70% faster user queries |
| **User** | `{ status: 1, createdAt: -1 }` | Status filtering with sort | Faster sorted queries |
| **User** | `{ name: 'text', email: 'text' }` | Text search | Full-text search capability |
| **MentorProfile** | `{ currentMenteeCount: 1, capacity: 1 }` | Availability checks | Instant availability filtering |
| **MentorProfile** | `{ createdAt: -1 }` | Newest mentors | Faster "newest" sort |
| **Goal** | `{ mentorship: 1, status: 1 }` | Goals by mentorship & status | Faster goal filtering |
| **Goal** | `{ learner: 1, status: 1, createdAt: -1 }` | Learner goals with status | Composite query optimization |
| **ProgressUpdate** | `{ learner: 1, createdAt: -1 }` | Learner progress history | Faster progress queries |

**Pre-existing indexes** (from earlier phases):
- MentorshipRequest: compound indexes for learner/mentor/status queries
- WeeklyCheckIn: indexes for goal/week uniqueness and mentorship queries
- AdminAuditLog: indexes for admin, action type, and timestamp queries

#### Pagination

All list endpoints now support pagination:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | number | 1 | - | Page number (1-indexed) |
| `limit` | number | 20 | 100 | Items per page |
| `sortBy` | string | createdAt | - | Field to sort by |
| `sortOrder` | string | desc | - | asc or desc |

**Response format:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Paginated API Examples

#### Get Mentor Profiles (with pagination)
```bash
# First page, 10 items, sorted by rating
GET /api/mentor-profiles?page=1&limit=10&sortBy=rating&sortOrder=desc

# Filter by skill and availability
GET /api/mentor-profiles?skill=javascript&onlyAvailable=true&page=1&limit=20
```

#### Get My Goals (with filtering)
```bash
# All goals, paginated
GET /api/goals?page=1&limit=10

# Only active goals
GET /api/goals?status=active&page=1&limit=10
```

#### Get Mentorship Requests
```bash
# Incoming requests for mentor (with status filter)
GET /api/mentorships/requests?status=pending&page=1&limit=20

# My requests as learner
GET /api/mentorships/my-requests?page=1&limit=10
```

#### Get Check-ins
```bash
# All my check-ins
GET /api/check-ins/my?page=1&limit=20

# Mentee check-ins (as mentor)
GET /api/check-ins/mentee/:menteeId?page=1&limit=20
```

#### Get Progress Updates
```bash
GET /api/progress/:goalId?page=1&limit=10
```

#### Admin: List Users
```bash
# With search and filters
GET /api/admin/users?search=john&role=learner&status=active&page=1&limit=20
```

### Input Validation

All endpoints validate input using express-validator. Validation errors return:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "value": "invalid-email"
    }
  ]
}
```

**Validation rules:**
- Email: valid format, normalized
- Password: minimum 6 characters
- Name: 2-50 characters, letters only
- Skills: array with 1+ items, each 1-50 chars
- Bio: max 500 characters
- Ratings: integer 1-5
- Pagination: page >= 1, limit 1-100

### API Health Check

```bash
GET /api/health

# Response
{
  "success": true,
  "message": "SkillBridge API is running",
  "environment": "development",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

<br><br><br><br><br>

---

