import StudentHome from "../features/student/pages/StudentHome";
import Schedule from "../features/student/pages/Schedule";
import Courses from "../features/student/pages/Courses";
import Quizzes from "../features/student/pages/Quizzes";
import Grades from "../features/student/pages/Grades";
import SecuritySettings from "../features/student/pages/SecuritySettings";

export const studentRoutes = [
  { index: true, element: StudentHome },
  { path: "home", element: StudentHome },
  { path: "schedule", element: Schedule },
  { path: "timetable", element: Schedule },
  { path: "courses", element: Courses },
  { path: "lessons", element: Courses },
  { path: "quizzes", element: Quizzes },
  { path: "assignments", element: Quizzes },
  { path: "grades", element: Grades },
  { path: "security", element: SecuritySettings }
];
