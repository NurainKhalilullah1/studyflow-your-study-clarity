# Epic: Focus

Productivity tools: the focus room, Pomodoro timer, assignments, and the upcoming calendar.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| G | Focus Room (Pomodoro + ambient audio) | Existing | existing |
| J | Assignments (basic) | Existing | in-progress |
| 3 | Calendar and assignment tracking | Slice 2 | planned |

---

## Existing features

### G. Focus Room · existing
Immersive study environment with a configurable Pomodoro timer (work/break intervals), ambient soundscapes powered by Tone.js (rain, forest, cafe, etc.), XP awards on Pomodoro completion, and a global Pomodoro context shared with the Dashboard widget.
code in `src/pages/FocusRoom.tsx`, `src/contexts/PomodoroContext.tsx`, `src/components/tutor/PomodoroTimer.tsx`, `src/hooks/usePomodoroTimer.ts`

### J. Assignments · in-progress
Basic assignment list: add, view, and mark assignments for courses. The page exists but deadline tracking, reminders, and calendar integration are not yet built.
code in `src/pages/Assignments.tsx`, `src/components/AddAssignmentDialog.tsx`

---

## Planned features

### 3. Calendar and assignment tracking · needs a decision
Upgrade the existing assignments page into a full calendar view that lets students see upcoming deadlines at a glance, set due dates and reminders per assignment, and get a weekly overview of what is due. The focus is on reducing missed deadlines, a pain point for Nigerian university students managing multiple courses.
**Done when:** a student can view a calendar with all assignments plotted by due date; add a new assignment with a title, course, and due date; receive a push notification reminder 24 hours before a deadline; and mark an assignment done from the calendar view; empty and overdue states render correctly.
- [ ] Design it (spec): `/architect calendar and assignment tracking`
