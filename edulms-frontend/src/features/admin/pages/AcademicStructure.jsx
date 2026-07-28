import React, { useState, useEffect } from "react";
import academicService from "../../../services/academicService";
import GradeClassTree from "../components/GradeClassTree";
import SubjectTable from "../components/SubjectTable";
import TeachingAssignmentManager from "../components/TeachingAssignmentManager";
import ClassRosterManager from "../components/ClassRosterManager";

export default function AcademicStructure() {
  const [activeTab, setActiveTab] = useState("tree"); // "tree" | "subjects" | "assignments" | "roster"
  const [selectedRosterClassId, setSelectedRosterClassId] = useState(null);

  // Dashboard statistics state
  const [stats, setStats] = useState({
    gradesCount: 0,
    classesCount: 0,
    subjectsCount: 0,
    assignmentsCount: 0
  });

  const handleSelectClassForRoster = (classId) => {
    setSelectedRosterClassId(classId);
    setActiveTab("roster");
  };

  const loadStats = async () => {
    try {
      const [gRes, cRes, sRes, aRes] = await Promise.all([
        academicService.getGrades(),
        academicService.getClasses(),
        academicService.getSubjects(),
        academicService.getTeachingAssignments()
      ]);

      setStats({
        gradesCount: gRes.data?.length || 0,
        classesCount: cRes.data?.length || 0,
        subjectsCount: sRes.data?.length || 0,
        assignmentsCount: aRes.data?.length || 0
      });
    } catch (err) {
      console.error("Lỗi tải thống kê học vụ:", err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-6 pb-12 font-sans bg-neutral-50 min-h-screen p-4 md:p-6 rounded-xl">
      {/* Header Banner - Clean Light Theme with Primary Indigo accent */}
      <div className="bg-white border border-neutral-200 p-6 md:p-8 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary-light text-primary text-xs font-semibold tracking-wide mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m-4 0h4" />
              </svg>
              Quản trị Học thuật (Academic Administration)
            </div>
            <h1 className="text-[28px] md:text-[32px] font-semibold text-neutral-900 tracking-tight">
              Quản lý Cấu trúc Học thuật
            </h1>
            <p className="text-[14px] text-neutral-600 mt-1.5 max-w-2xl leading-relaxed">
              Tổ chức sơ đồ Khối - Lớp học, danh mục Môn học, phân công Giáo viên và Quản lý danh sách học sinh theo lớp (Roster).
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-center min-w-[100px]">
              <span className="text-[22px] font-bold text-primary">{stats.gradesCount}</span>
              <p className="text-xs text-neutral-600 font-medium mt-0.5">Khối học</p>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-center min-w-[100px]">
              <span className="text-[22px] font-bold text-success">{stats.classesCount}</span>
              <p className="text-xs text-neutral-600 font-medium mt-0.5">Lớp học</p>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-center min-w-[100px]">
              <span className="text-[22px] font-bold text-warning">{stats.subjectsCount}</span>
              <p className="text-xs text-neutral-600 font-medium mt-0.5">Môn học</p>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-center min-w-[100px]">
              <span className="text-[22px] font-bold text-purple-600">{stats.assignmentsCount}</span>
              <p className="text-xs text-neutral-600 font-medium mt-0.5">Phân công</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-8 border-b border-neutral-200 pb-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("tree")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === "tree"
                ? "bg-primary-light text-primary border-primary font-semibold"
                : "text-neutral-600 hover:text-neutral-900 border-transparent hover:bg-neutral-50"
            }`}
          >
            <span>🌳 Cấu trúc Khối & Lớp học</span>
          </button>

          <button
            onClick={() => setActiveTab("roster")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === "roster"
                ? "bg-primary-light text-primary border-primary font-semibold"
                : "text-neutral-600 hover:text-neutral-900 border-transparent hover:bg-neutral-50"
            }`}
          >
            <span>📋 Danh sách Lớp & Chuyển lớp (Roster)</span>
          </button>

          <button
            onClick={() => setActiveTab("subjects")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === "subjects"
                ? "bg-primary-light text-primary border-primary font-semibold"
                : "text-neutral-600 hover:text-neutral-900 border-transparent hover:bg-neutral-50"
            }`}
          >
            <span>📚 Danh mục Môn học</span>
          </button>

          <button
            onClick={() => setActiveTab("assignments")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === "assignments"
                ? "bg-primary-light text-primary border-primary font-semibold"
                : "text-neutral-600 hover:text-neutral-900 border-transparent hover:bg-neutral-50"
            }`}
          >
            <span>👨‍🏫 Phân công Giảng dạy</span>
          </button>
        </div>
      </div>

      {/* Tab Content Panels */}
      <div className="transition-all duration-300">
        {activeTab === "tree" && <GradeClassTree onRefreshData={loadStats} onSelectClassForRoster={handleSelectClassForRoster} />}
        {activeTab === "roster" && <ClassRosterManager selectedClassId={selectedRosterClassId} onRefreshData={loadStats} />}
        {activeTab === "subjects" && <SubjectTable onRefreshData={loadStats} />}
        {activeTab === "assignments" && <TeachingAssignmentManager onRefreshData={loadStats} />}
      </div>
    </div>
  );
}
