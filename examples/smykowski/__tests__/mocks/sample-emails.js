// ============================================================================
// Sample Email Fixtures
// ============================================================================
export const meetingNotesEmail = {
    message_id: 'msg-meeting-001',
    thread_id: 'thread-sprint-planning',
    from: {
        email: 'alice@team.com',
        name: 'Alice Johnson',
    },
    to: [
        { email: 'bob@team.com', name: 'Bob Smith' },
        { email: 'carol@team.com', name: 'Carol Williams' },
        { email: 'tom@smykowski.work', name: 'Tom Smykowski' },
    ],
    cc: [],
    subject: 'Sprint Planning Notes - Nov 8',
    body: `Hi team,

Here are the notes from today's sprint planning meeting:

Action Items:
- Bob will implement the authentication flow by Friday (Nov 15)
- Carol needs to review the API design document by Wednesday (Nov 13)
- Alice will update the deployment documentation this week

Decisions Made:
- We decided to postpone the mobile app development until Q2
- Using OAuth 2.0 for authentication (not custom auth)
- Sprint 1 deadline is Nov 17

Bob mentioned he might need help with the OAuth integration if he runs into issues.

Thanks everyone!
Alice`,
    timestamp: '2025-11-08T16:00:00Z',
};
export const commitmentEmail = {
    message_id: 'msg-commitment-001',
    thread_id: 'thread-api-review',
    from: {
        email: 'bob@team.com',
        name: 'Bob Smith',
    },
    to: [
        { email: 'alice@team.com', name: 'Alice Johnson' },
    ],
    cc: [{ email: 'tom@smykowski.work', name: 'Tom Smykowski' }],
    subject: 'Re: API Design Review',
    body: `Hi Alice,

I'll review the API design document and provide feedback by end of day Wednesday.

I'm committing to having my review comments posted by 5pm EST on Wednesday.

Thanks,
Bob`,
    timestamp: '2025-11-09T10:00:00Z',
    in_reply_to: 'msg-api-request-001',
};
export const vacationEmail = {
    message_id: 'msg-vacation-001',
    thread_id: 'thread-vacation',
    from: {
        email: 'alice@team.com',
        name: 'Alice Johnson',
    },
    to: [
        { email: 'tom@smykowski.work', name: 'Tom Smykowski' },
    ],
    cc: [
        { email: 'lead@team.com', name: 'Team Lead' },
    ],
    subject: 'Vacation Next Week',
    body: `Hi Tom,

I'm going on vacation next week (Nov 18-22).

Can you please reassign my open issues to other team members while I'm out?
Bob or Carol should be able to cover my work.

I'll be back on Monday Nov 25.

Thanks,
Alice`,
    timestamp: '2025-11-10T09:00:00Z',
};
export const statusRequestEmail = {
    message_id: 'msg-status-001',
    thread_id: 'thread-status-check',
    from: {
        email: 'lead@team.com',
        name: 'Team Lead',
    },
    to: [
        { email: 'tom@smykowski.work', name: 'Tom Smykowski' },
    ],
    cc: [],
    subject: 'Project Status Check',
    body: `Hi Tom,

What's the current status of Project Alpha?

Can you give me an update on:
- Completion percentage
- Any blockers or risks
- What needs attention this week

Thanks,
Team Lead`,
    timestamp: '2025-11-10T11:00:00Z',
};
export const urgentRequestEmail = {
    message_id: 'msg-urgent-001',
    thread_id: 'thread-urgent-bug',
    from: {
        email: 'carol@team.com',
        name: 'Carol Williams',
    },
    to: [
        { email: 'bob@team.com', name: 'Bob Smith' },
        { email: 'tom@smykowski.work', name: 'Tom Smykowski' },
    ],
    cc: [],
    subject: 'URGENT: Login Bug',
    body: `Hi Bob,

We have an urgent bug - users can't log in if their password has special characters.

This needs to be fixed ASAP. Can you commit to fixing this today?

I'll create a hotfix branch.

Carol`,
    timestamp: '2025-11-10T14:00:00Z',
};
export const prReminderNeededEmail = {
    message_id: 'msg-pr-reminder-001',
    thread_id: 'thread-pr-waiting',
    from: {
        email: 'bob@team.com',
        name: 'Bob Smith',
    },
    to: [
        { email: 'alice@team.com', name: 'Alice Johnson' },
        { email: 'tom@smykowski.work', name: 'Tom Smykowski' },
    ],
    cc: [],
    subject: 'PR #48 Needs Review',
    body: `Hi Alice,

My PR #48 (database refactoring) has been open for 4 days without any reviews.

Can you take a look when you get a chance? It's blocking my work on Issue #125.

Thanks,
Bob`,
    timestamp: '2025-11-09T15:00:00Z',
};
export const dependencyEmail = {
    message_id: 'msg-dependency-001',
    thread_id: 'thread-blocked-work',
    from: {
        email: 'carol@team.com',
        name: 'Carol Williams',
    },
    to: [
        { email: 'bob@team.com', name: 'Bob Smith' },
        { email: 'tom@smykowski.work', name: 'Tom Smykowski' },
    ],
    cc: [],
    subject: 'Issue #130 Blocked',
    body: `Hi Bob,

I can't start working on Issue #130 (frontend dashboard) until Issue #123 (auth flow) is completed.

Issue #130 is blocked by #123.

Let me know if you need any help getting #123 done.

Carol`,
    timestamp: '2025-11-10T10:00:00Z',
};
export const retrospectiveRequestEmail = {
    message_id: 'msg-retro-001',
    thread_id: 'thread-retrospective',
    from: {
        email: 'lead@team.com',
        name: 'Team Lead',
    },
    to: [
        { email: 'tom@smykowski.work', name: 'Tom Smykowski' },
    ],
    cc: [],
    subject: 'Sprint 1 Retrospective Data',
    body: `Hi Tom,

Can you provide a data-driven summary for our Sprint 1 retrospective?

I'd like to see:
- Velocity and completion stats
- What went well (metrics)
- What didn't go well (bottlenecks)
- Specific process improvement suggestions

Meeting is Friday at 2pm.

Thanks,
Team Lead`,
    timestamp: '2025-11-16T09:00:00Z',
};
export const workloadConcernEmail = {
    message_id: 'msg-workload-001',
    thread_id: 'thread-workload',
    from: {
        email: 'bob@team.com',
        name: 'Bob Smith',
    },
    to: [
        { email: 'tom@smykowski.work', name: 'Tom Smykowski' },
    ],
    cc: [
        { email: 'lead@team.com', name: 'Team Lead' },
    ],
    subject: 'Feeling Overwhelmed',
    body: `Hi Tom,

I'm feeling a bit overwhelmed with my current workload. I have 8 open issues assigned to me,
plus 3 PRs to review, and Alice just asked me to take on Issue #135 as well.

Can you help figure out if some of my work can be reassigned? I don't want to drop the ball
on anything but I'm worried I can't deliver everything by the deadline.

Thanks,
Bob`,
    timestamp: '2025-11-10T16:00:00Z',
};
export const newMemberEmail = {
    message_id: 'msg-newmember-001',
    thread_id: 'thread-onboarding',
    from: {
        email: 'lead@team.com',
        name: 'Team Lead',
    },
    to: [
        { email: 'tom@smykowski.work', name: 'Tom Smykowski' },
    ],
    cc: [
        { email: 'dave@team.com', name: 'Dave Wilson' },
    ],
    subject: 'New Team Member - Dave Wilson',
    body: `Hi Tom,

We have a new team member joining us - Dave Wilson (dave@team.com).

Can you help onboard Dave? He'll need:
- Access to the repo
- Introduction to the team
- Overview of our processes
- Understanding of current projects

His GitHub username is @davew.

Thanks,
Team Lead`,
    timestamp: '2025-11-10T08:00:00Z',
};
// ============================================================================
// Email Collections
// ============================================================================
export const allSampleEmails = [
    meetingNotesEmail,
    commitmentEmail,
    vacationEmail,
    statusRequestEmail,
    urgentRequestEmail,
    prReminderNeededEmail,
    dependencyEmail,
    retrospectiveRequestEmail,
    workloadConcernEmail,
    newMemberEmail,
];
export const emailsByType = {
    meetingNotes: [meetingNotesEmail],
    commitment: [commitmentEmail],
    vacation: [vacationEmail],
    statusRequest: [statusRequestEmail],
    urgent: [urgentRequestEmail],
    prReminder: [prReminderNeededEmail],
    dependency: [dependencyEmail],
    retrospective: [retrospectiveRequestEmail],
    workload: [workloadConcernEmail],
    onboarding: [newMemberEmail],
};
//# sourceMappingURL=sample-emails.js.map