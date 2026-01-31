# SkillBridge - Mentorship & Accountability Platform

SkillBridge is a MERN stack application that connects learners with mentors and helps learners stay accountable through goals and progress tracking.

## User Roles & Capabilities

### Learner

| Capability | Description |
|------------|-------------|
| Browse Mentors | Search and filter available mentors by skills, rating, and availability |
| View Mentor Profiles | See mentor bio, skills, experience level, trust score, and reviews |
| Request Mentorship | Send personalized mentorship requests to available mentors |
| Track Goals | View learning goals assigned by mentor with status tracking |
| Submit Progress Updates | Document progress on goals with detailed updates |
| Weekly Check-ins | Submit weekly accountability check-ins (planned, completed, blockers) |
| Complete Mentorship | Mark mentorship as complete when goals are achieved |
| Rate Mentor | Provide anonymous 1-5 star rating after mentorship completion |

### Mentor

| Capability | Description |
|------------|-------------|
| Create Profile | Set up profile with skills, bio, and mentee capacity |
| Review Requests | Accept or reject incoming mentorship requests |
| View Learner Reliability | See learner's reliability score and history before accepting |
| Create Goals | Define learning goals for mentees |
| Track Progress | Monitor mentee progress updates and check-in submissions |
| Manage Mentees | View all active mentees and their status (active, at-risk, paused) |
| Reactivate Mentorships | Resume paused mentorships for inactive learners |
| Rate Learner | Provide anonymous 1-5 star rating after mentorship completion |

### Admin

| Capability | Description |
|------------|-------------|
| View Dashboard | Platform-wide statistics (users, mentorships, activity) |
| Manage Users | Search, filter, view activity, suspend, and reinstate users |
| Manage Mentorships | View details, pause for disputes, force-complete mentorships |
| Audit Logs | View immutable logs of all admin actions with filters |
| Monitor Health | Track at-risk mentorships and suspended users |

---

## Key Functionalities

### 1. Mentorship Lifecycle Management
- Request → Accept/Reject → Active → At-Risk → Paused → Completed
- Automatic status transitions based on learner activity
- Manual intervention options for both mentors and admins

### 2. Accountability System
- Weekly check-in submissions with structured format
- Automatic inactivity detection (2 weeks = at-risk, 3 weeks = paused)
- Scheduled Monday morning checks via cron job
- Real-time status updates on dashboard load

### 3. Reputation & Trust System
- **Learner Reliability Score (0-100)**: Based on mentor feedback, check-in consistency, and completion history
- **Mentor Trust Score (0-100)**: Based on ratings, completion rate, and experience
- Risk level indicators (Low/Medium/High) with warning messages
- Anonymous bidirectional ratings after mentorship completion

### 4. Goal & Progress Tracking
- Mentors create structured goals for learners
- Learners submit progress updates with descriptions
- Status tracking (active, completed) for each goal
- Historical progress timeline view

### 5. Admin Platform Management
- User moderation with suspension/reinstatement
- Dispute resolution for mentorships
- Complete audit trail of all admin actions
- Platform health monitoring dashboard

---

## Key Features

### User Experience
- Clean, minimal UI design (Linear/Notion inspired)
- Role-based dashboards with contextual navigation
- Real-time status indicators and alerts
- Responsive card-based layouts

### Security & Validation
- JWT-based authentication with role separation
- Input validation on all endpoints (express-validator)
- Rate limiting for API protection
- Separate admin authentication flow
- Immutable audit logging

### Performance
- Database indexes for optimized queries
- Pagination on all list endpoints
- Configurable limits and defaults
- Environment-based configuration

### Automation
- Scheduled inactivity checks (configurable cron)
- Automatic mentorship status transitions
- Real-time reliability score calculation
- Dynamic trust score computation

---

## Technical Highlights

### Architecture
- **Frontend**: React 18 + Vite, React Router, Context API
- **Backend**: Node.js, Express.js, MongoDB with Mongoose
- **Authentication**: JWT tokens with role-based access control
- **Scheduling**: node-cron for automated tasks

### Database Design
- Compound indexes for complex query optimization
- Text indexes for full-text search
- Referential integrity with Mongoose populate
- Audit log collection for compliance

### API Design
- RESTful endpoints with consistent response format
- Pagination metadata in all list responses
- Validation error details for debugging
- Health check endpoint for monitoring

---

## Feature Summary Table

| Feature | Learner | Mentor | Admin |
|---------|:-------:|:------:|:-----:|
| View Dashboard | ✓ | ✓ | ✓ |
| Browse/Search Mentors | ✓ | - | - |
| Send Mentorship Request | ✓ | - | - |
| Accept/Reject Requests | - | ✓ | - |
| Create Goals | - | ✓ | - |
| Submit Progress Updates | ✓ | - | - |
| Submit Weekly Check-ins | ✓ | - | - |
| View Progress/Check-ins | ✓ | ✓ | ✓ |
| Complete Mentorship | ✓ | - | ✓ |
| Pause Mentorship | - | - | ✓ |
| Rate After Completion | ✓ | ✓ | - |
| View Reliability Scores | - | ✓ | ✓ |
| Suspend/Reinstate Users | - | - | ✓ |
| View Audit Logs | - | - | ✓ |

---

## Scoring Systems Summary

### Learner Reliability Score (0-100)
| Component | Max Points | Calculation |
|-----------|------------|-------------|
| Mentor Feedback | 40 | (avgRating / 5) × 40 |
| Check-in Consistency | 30 | (weeksWithCheckIns / totalWeeks) × 30 |
| Completion History | 20 | (completionRate / 100) × 20 |
| Stick-with-it Bonus | 10 | ((100 - earlyTerminationRate) / 100) × 10 |

### Mentor Trust Score (0-100)
| Component | Max Points | Calculation |
|-----------|------------|-------------|
| Rating Score | 50 | (avgRating / 5) × 50 |
| Completion Rate | 30 | (completionRate / 100) × 30 |
| Experience | 20 | min(completedMentorships × 2, 20) |

---

## Mentorship Status Flow

```
┌─────────┐     ┌────────┐     ┌─────────┐     ┌────────┐
│ PENDING │────▶│ ACTIVE │────▶│ AT-RISK │────▶│ PAUSED │
└─────────┘     └────────┘     └─────────┘     └────────┘
                    │              │                │
                    │              │                │
                    ▼              ▼                ▼
               ┌───────────┐  (check-in)      (reactivate)
               │ COMPLETED │◀──────────────────────┘
               └───────────┘
```

| Status | Trigger |
|--------|---------|
| Pending | Learner sends request |
| Active | Mentor accepts request |
| At-Risk | 2 consecutive missed check-in weeks |
| Paused | 3+ consecutive missed check-in weeks |
| Completed | Learner or Admin marks complete |
| Rejected | Mentor declines request |

---

## Documentation Highlights

### What Makes SkillBridge Unique
1. **Bidirectional Accountability**: Both learners and mentors are rated, creating a balanced ecosystem
2. **Automatic Inactivity Handling**: System manages engagement without manual intervention
3. **Transparent Reputation**: Reliability scores help mentors make informed decisions
4. **Admin Oversight**: Full moderation capabilities with audit trail
5. **Production-Ready**: Environment configs, validation, indexing, and pagination included

### Technical Achievements
- Complete MERN stack implementation
- Role-based access control (RBAC)
- Automated scheduling system
- Comprehensive input validation
- Database optimization with indexes
- Immutable audit logging
- Environment-based configuration
- RESTful API with pagination

### UI/UX Design Principles
- Ultra-minimal aesthetic (Linear/Notion inspired)
- Calm blue accent color for trust and professionalism
- 8px spacing system for consistency
- Inter font for modern readability
- Subtle shadows and transitions
- Clear visual hierarchy with typography
- Status badges with semantic colors

---

## License

This project is for educational/MVP purposes.
