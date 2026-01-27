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
~