import Classes from "../features/teacher/pages/Classes";
import Attendance from "../features/teacher/pages/Attendance";
import Assignments from "../features/teacher/pages/Assignments";
import Grading from "../features/teacher/pages/Grading";
import Syllabus from "../features/teacher/pages/Syllabus";

export const teacherRoutes = [
  { index: true, element: Classes },
  { path: "classes", element: Classes },
  { path: "attendance", element: Attendance },
  { path: "assignments", element: Assignments },
  { path: "grading", element: Grading },
  { path: "syllabus", element: Syllabus }
];

