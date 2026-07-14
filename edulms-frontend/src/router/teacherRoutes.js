import Dashboard from "../features/teacher/pages/Dashboard";
import Classes from "../features/teacher/pages/Classes";
import Syllabus from "../features/teacher/pages/Syllabus";
import Grading from "../features/teacher/pages/Grading";
import Assignments from "../features/teacher/pages/Assignments";

export const teacherRoutes = [
  { index: true, element: Dashboard },
  { path: "classes", element: Classes },
  { path: "syllabus", element: Syllabus },
  { path: "grading", element: Grading },
  { path: "assignments", element: Assignments }
];
