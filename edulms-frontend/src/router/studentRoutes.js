import Schedule from "../features/student/pages/Schedule";
import Courses from "../features/student/pages/Courses";
import Quizzes from "../features/student/pages/Quizzes";
import Grades from "../features/student/pages/Grades";

export const studentRoutes = [
  { index: true, element: Schedule },
  { path: "schedule", element: Schedule },
  { path: "timetable", element: Schedule },
  { path: "courses", element: Courses },
  { path: "lessons", element: Courses },
  { path: "quizzes", element: Quizzes },
  { path: "assignments", element: Quizzes },
  { path: "grades", element: Grades }
];

