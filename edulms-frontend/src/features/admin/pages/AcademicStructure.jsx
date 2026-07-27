import React, { useState, useEffect } from "react";
import academicService from "../../../services/academicService";
import GradeClassTree from "../components/GradeClassTree";
import SubjectTable from "../components/SubjectTable";
import TeachingAssignmentManager from "../components/TeachingAssignmentManager";

export default function AcademicStructure() {
  const [activeTab, setActiveTab] = useState("tree"); // "tree" | "subjects" | "assignments"
  
  // Dashboard statistics state
  const [stats, setStats] = useState({
    gradesCount: 0,
    classesCount: 0,
    subjectsCount: 0,
    assignmentsCount: 0
  });

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
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 p-6 md:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m-4 0h4" />
              </svg>
              Academic Administration
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Quản lý Cấu trúc Học thuật
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Tổ chức sơ đồ Khối - Lớp học, danh mục Môn học, phân công Giáo viên Chủ nhiệm và Giảng dạy bộ môn trong nhà trường.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-xl font-black text-indigo-400">{stats.gradesCount}</span>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Khối học</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-xl font-black text-emerald-400">{stats.classesCount}</span>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Lớp học</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-xl font-black text-amber-400">{stats.subjectsCount}</span>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Môn học</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl text-center min-w-[90px]">
              <span className="text-xl font-black text-purple-400">{stats.assignmentsCount}</span>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Phân công</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-2 mt-8 border-b border-slate-800/80 pb-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("tree")}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-semibold rounded-t-xl transition-all duration-200 border-b-2 whitespace-nowrap ${
              activeTab === "tree"
                ? "bg-slate-800/60 text-indigo-400 border-indigo-500"
                : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/30"
            }`}
          >
            <span>🌳 Cấu trúc Khối & Lớp học</span>
          </button>

          <button
            onClick={() => setActiveTab("subjects")}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-semibold rounded-t-xl transition-all duration-200 border-b-2 whitespace-nowrap ${
              activeTab === "subjects"
                ? "bg-slate-800/60 text-indigo-400 border-indigo-500"
                : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/30"
            }`}
          >
            <span>📚 Danh mục Môn học</span>
          </button>

          <button
            onClick={() => setActiveTab("assignments")}
            className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-semibold rounded-t-xl transition-all duration-200 border-b-2 whitespace-nowrap ${
              activeTab === "assignments"
                ? "bg-slate-800/60 text-indigo-400 border-indigo-500"
                : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/30"
            }`}
          >
            <span>👨‍🏫 Phân công Giảng dạy</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="transition-all duration-300">
        {activeTab === "tree" && <GradeClassTree onRefreshData={loadStats} />}
        {activeTab === "subjects" && <SubjectTable onRefreshData={loadStats} />}
        {activeTab === "assignments" && <TeachingAssignmentManager onRefreshData={loadStats} />}
      </div>
    </div>
  );
}
