import Dashboard from "../features/student/pages/Dashboard";
import Courses from "../features/student/pages/Courses";
import Quizzes from "../features/student/pages/Quizzes";
import Grades from "../features/student/pages/Grades";
import Schedule from "../features/student/pages/Schedule";

export const studentRoutes = [
  { index: true, element: Dashboard },
  { path: "courses", element: Courses },
  { path: "quizzes", element: Quizzes },
  { path: "grades", element: Grades },
  { path: "schedule", element: Schedule }
];
