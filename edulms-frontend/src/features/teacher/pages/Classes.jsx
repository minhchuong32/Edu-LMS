import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import academicService from "../../../services/academicService";
import studentService from "../../../services/studentService";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import AssignParentModal from "../../users/AssignParentModal";
import { Users, UserCheck, UserX, Search, UserPlus, BookOpen, RefreshCw, AlertCircle } from "lucide-react";

export default function Classes() {
  const { user: currentUser } = useAuth();
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [loadingClass, setLoadingClass] = useState(true);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [search, setSearch] = useState("");
  const [studentParentsMap, setStudentParentsMap] = useState({}); // { [studentId]: [parentObjects] }

  // Assign Parent Modal State
  const [assignParentStudent, setAssignParentStudent] = useState(null);

  // Toast State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch the homeroom class of current teacher
  useEffect(() => {
    const fetchHomeroomClass = async () => {
      setLoadingClass(true);
      try {
        const res = await academicService.getClasses();
        const data = res?.data || res || [];
        if (Array.isArray(data) && data.length > 0) {
          // Find class where homeroomTeacherRef matches current user ID
          const currentUserId = currentUser?._id || currentUser?.id;
          const foundHomeroom = data.find((c) => {
            const teacherId = c.homeroomTeacherRef?._id || c.homeroomTeacherRef;
            return String(teacherId) === String(currentUserId);
          });

          // Strictly set homeroomClass if teacher is homeroom teacher of a class
          setHomeroomClass(foundHomeroom || null);
        } else {
          setHomeroomClass(null);
        }
      } catch (err) {
        console.error("Lỗi lấy thông tin lớp chủ nhiệm:", err);
        setHomeroomClass(null);
      } finally {
        setLoadingClass(false);
      }
    };

    fetchHomeroomClass();
  }, [currentUser]);

  // 2. Fetch students belonging to the homeroom class
  const fetchStudents = async () => {
    if (!homeroomClass?._id) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    try {
      const params = { classRef: homeroomClass._id };
      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await academicService.getStudents(params);
      const data = res?.data || res || [];
      const studentList = Array.isArray(data) ? data : [];
      setStudents(studentList);

      // Fetch parents for each student concurrently
      fetchParentsForStudents(studentList);
    } catch (err) {
      console.error("Lỗi lấy danh sách học sinh lớp chủ nhiệm:", err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Helper to fetch parents for list of students
  const fetchParentsForStudents = async (studentList) => {
    const map = {};
    await Promise.all(
      studentList.map(async (st) => {
        try {
          const res = await studentService.getStudentParents(st._id);
          const parents = res?.data || res || [];
          map[st._id] = Array.isArray(parents) ? parents : [];
        } catch {
          map[st._id] = [];
        }
      })
    );
    setStudentParentsMap(map);
  };

  useEffect(() => {
    if (homeroomClass?._id) {
      const timer = setTimeout(() => {
        fetchStudents();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [homeroomClass, search]);

  const relationshipLabels = {
    father: "Cha",
    mother: "Mẹ",
    guardian: "Người giám hộ",
    other: "Khác",
  };

  // Stats calculation
  const totalStudents = students.length;
  const studentsWithParentsCount = students.filter(
    (st) => (studentParentsMap[st._id] || []).length > 0
  ).length;
  const studentsWithoutParentsCount = totalStudents - studentsWithParentsCount;

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border transition-all animate-bounce ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✨"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4 text-purple-600" />
            <span>Quản Lý Lớp Chủ Nhiệm</span>
          </div>
          <h1 className="text-2xl font-bold font-outfit text-neutral-900 flex items-center gap-3">
            <span>Danh Sách Học Sinh Lớp Chủ Nhiệm</span>
            {homeroomClass && (
              <span className="text-sm font-semibold bg-purple-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200">
                Lớp {homeroomClass.name} ({homeroomClass.schoolYear})
              </span>
            )}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Quản lý danh sách học sinh thuộc lớp chủ nhiệm của bạn, gán và cập nhật thông tin phụ huynh liên kết.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchStudents}
          className="py-2 px-4 text-xs shadow-sm flex items-center gap-1.5 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingStudents ? "animate-spin" : ""}`} />
          <span>Làm mới dữ liệu</span>
        </Button>
      </div>

      {loadingClass ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-neutral-200">
          <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
          <p className="text-xs font-medium text-neutral-600">Đang tải thông tin lớp chủ nhiệm...</p>
        </div>
      ) : !homeroomClass ? (
        <Card className="p-12 text-center space-y-3 border border-dashed border-neutral-300">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-neutral-900 text-base">Bạn chưa quản lý lớp nào</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
            Tài khoản giáo viên của bạn hiện chưa được phân công làm Giáo viên Chủ nhiệm cho lớp học nào trong hệ thống. Vui lòng liên hệ Quản trị viên (Admin) để được phân công lớp chủ nhiệm.
          </p>
        </Card>
      ) : (
        <>
          {/* Overview Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center gap-4 border border-neutral-200/80 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-neutral-500 font-medium block">Sĩ số lớp chủ nhiệm</span>
                <span className="text-2xl font-bold text-neutral-900">{totalStudents}</span>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4 border border-neutral-200/80 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-neutral-500 font-medium block">Đã gán phụ huynh</span>
                <span className="text-2xl font-bold text-emerald-700">{studentsWithParentsCount}</span>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4 border border-neutral-200/80 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-neutral-500 font-medium block">Chưa gán phụ huynh</span>
                <span className="text-2xl font-bold text-amber-700">{studentsWithoutParentsCount}</span>
              </div>
            </Card>
          </div>

          {/* Search Bar */}
          <Card className="p-4 shadow-sm flex items-center justify-between border border-neutral-200">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Tìm học sinh trong Lớp ${homeroomClass.name} (Họ tên, email, MSSV)...`}
                className="w-full pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 bg-white border border-neutral-200 focus:ring-1 focus:ring-purple-600 focus:border-purple-600 rounded-xl outline-none transition"
              />
            </div>
            <div className="text-xs font-semibold text-neutral-500 hidden sm:block">
              Lớp phụ trách: <strong className="text-purple-800">Lớp {homeroomClass.name}</strong>
            </div>
          </Card>

          {/* Main Students & Parents Directory Table */}
          <Card className="p-6 shadow-sm space-y-4 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-700" />
                <span>Danh Sách Học Sinh - Lớp {homeroomClass.name}</span>
              </h3>
              <Badge variant="neutral">Sĩ số: {students.length}</Badge>
            </div>

            {loadingStudents ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <span className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></span>
                <p className="text-xs font-medium text-neutral-600">Đang tải danh sách học sinh lớp chủ nhiệm...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 bg-neutral-50 border border-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mb-3">
                  <Users className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-neutral-900 text-sm">Không có học sinh nào</h4>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                  {search.trim()
                    ? `Không tìm thấy học sinh phù hợp với từ khóa "${search}".`
                    : `Lớp ${homeroomClass.name} chưa có học sinh nào được xếp vào.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-600 uppercase border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-3">Mã SV / MSSV</th>
                      <th className="px-4 py-3">Họ và tên Học Sinh</th>
                      <th className="px-4 py-3">Lớp học</th>
                      <th className="px-4 py-3">Phụ Huynh Liên Kết</th>
                      <th className="px-4 py-3 text-center">Thao Tác Gán</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {students.map((st) => {
                      const parents = studentParentsMap[st._id] || [];
                      return (
                        <tr key={st._id} className="hover:bg-neutral-50/60 transition">
                          <td className="px-4 py-3 font-mono font-bold text-neutral-800">
                            {st.studentCode || <span className="text-neutral-400 italic">Chưa cấp</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-neutral-900">{st.name}</div>
                            <div className="text-neutral-500 font-mono text-[11px]">{st.email}</div>
                          </td>
                          <td className="px-4 py-3 font-medium text-neutral-700">
                            <span className="bg-purple-50 text-purple-800 px-2.5 py-0.5 rounded border border-purple-200 font-bold">
                              Lớp {homeroomClass.name}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {parents.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {parents.map((p) => (
                                  <span
                                    key={p._id}
                                    className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold text-[11px]"
                                  >
                                    <span>{p.name}</span>
                                    {p.relationship && (
                                      <span className="text-[9px] bg-emerald-200/60 text-emerald-900 px-1 rounded uppercase">
                                        {relationshipLabels[p.relationship] || p.relationship}
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1">
                                <span>⏳</span> Chưa có phụ huynh
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="outline"
                              onClick={() => setAssignParentStudent(st)}
                              className="py-1.5 px-3 text-xs shadow-sm hover:border-purple-600 hover:text-purple-700 transition inline-flex items-center gap-1.5"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Gán / Quản lý Phụ huynh</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Standalone Reusable Assign Parent Modal */}
      <AssignParentModal
        isOpen={Boolean(assignParentStudent)}
        student={assignParentStudent}
        onClose={() => setAssignParentStudent(null)}
        onSuccess={() => {
          fetchStudents();
          showToast("Đã cập nhật phụ huynh liên kết cho học sinh!", "success");
        }}
      />
    </div>
  );
}
