import { useState } from "react";

export default function Dashboard() {
  const stats = [
    {
      title: "Total Courses",
      value: "14",
      change: "+2 this month",
      isPositive: true,
      color: "from-blue-500/10 to-indigo-500/10",
      textColor: "text-blue-600",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      title: "Active Students",
      value: "1,248",
      change: "+12% vs last month",
      isPositive: true,
      color: "from-emerald-500/10 to-teal-500/10",
      textColor: "text-emerald-600",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: "Pending Assignments",
      value: "42",
      change: "8 require urgent grading",
      isPositive: false,
      color: "from-amber-500/10 to-orange-500/10",
      textColor: "text-amber-600",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    {
      title: "Average Engagement",
      value: "94.2%",
      change: "+4.1% increase",
      isPositive: true,
      color: "from-brand-500/10 to-purple-500/10",
      textColor: "text-brand-600",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    }
  ];

  const recentCourses = [
    {
      code: "SE-302",
      name: "Software Engineering Methodology",
      students: 45,
      progress: 75,
      status: "Active",
      category: "Software"
    },
    {
      code: "DB-101",
      name: "Database Systems Theory & Lab",
      students: 60,
      progress: 40,
      status: "Active",
      category: "Database"
    },
    {
      code: "AI-401",
      name: "Introduction to Artificial Intelligence",
      students: 35,
      progress: 90,
      status: "Review Phase",
      category: "Intelligence"
    },
    {
      code: "WEB-202",
      name: "Advanced Web Development",
      students: 52,
      progress: 60,
      status: "Active",
      category: "Frontend"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 to-indigo-800 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-brand-500/10">
        {/* Subtle decorative background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-brand-400/20 rounded-full blur-2xl"></div>

        <div className="relative z-10 max-w-xl">
          <span className="inline-block px-3 py-1 bg-white/10 text-xs font-semibold uppercase tracking-wider rounded-full mb-3 backdrop-blur-md">
            Summer Semester 2026
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold font-outfit tracking-tight mb-2">
            Welcome back, Nguyen Minh Chuong!
          </h2>
          <p className="text-brand-100 text-sm leading-relaxed mb-4">
            Your courses are performing well. You have 8 assignments waiting for evaluation and 2 pending class approval requests.
          </p>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white text-brand-600 font-semibold text-xs rounded-xl shadow-sm hover:bg-slate-50 transition">
              Create New Course
            </button>
            <button className="px-4 py-2 bg-brand-500/40 text-white font-semibold text-xs rounded-xl hover:bg-brand-500/60 transition border border-white/10">
              View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="p-5 bg-white border border-slate-200/60 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium">{stat.title}</span>
              <p className="text-2xl font-bold font-outfit text-slate-800">{stat.value}</p>
              <span
                className={`inline-block text-[10px] font-semibold ${
                  stat.isPositive ? "text-emerald-500" : "text-amber-500"
                }`}
              >
                {stat.change}
              </span>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} ${stat.textColor}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main content Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Courses List Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-outfit font-bold text-slate-800 text-base">Ongoing Courses</h3>
              <p className="text-xs text-slate-400 font-medium">Overview of current classes under development</p>
            </div>
            <button className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              View All
            </button>
          </div>

          <div className="space-y-4">
            {recentCourses.map((course) => (
              <div
                key={course.code}
                className="p-4 bg-slate-50/60 border border-slate-100 hover:border-brand-200 rounded-xl transition duration-200 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold font-outfit text-sm">
                      {course.code.split("-")[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">{course.code}</p>
                      <h4 className="text-sm font-bold text-slate-700 group-hover:text-brand-600 transition-colors">
                        {course.name}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-brand-50 text-brand-600 font-semibold text-[10px] rounded-full">
                      {course.category}
                    </span>
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 font-semibold text-[10px] rounded-full">
                      {course.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Progress</span>
                    <span className="font-semibold text-slate-700">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-medium">
                    <span>Enrolled: {course.students} students</span>
                    <span>Next Milestone: Week 8 Assignment</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Activity Card */}
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-outfit font-bold text-slate-800 text-base">Recent Activities</h3>
              <p className="text-xs text-slate-400 font-medium">Live platform logs & submissions</p>
            </div>
          </div>

          <div className="relative pl-4 border-l border-slate-100 space-y-5">
            <div className="relative">
              <span className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 bg-brand-500 rounded-full ring-4 ring-brand-50"></span>
              <p className="text-xs font-bold text-slate-700">Assignment Submitted</p>
              <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed mt-0.5">
                Tran Van B submitted <span className="font-semibold text-slate-600">Database Lab 3</span>.
              </p>
              <span className="text-[9px] text-slate-400 font-semibold block mt-1">10 minutes ago</span>
            </div>

            <div className="relative">
              <span className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-4 ring-emerald-50"></span>
              <p className="text-xs font-bold text-slate-700">New Student Registered</p>
              <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed mt-0.5">
                Le Hoang Nam enrolled in <span className="font-semibold text-slate-600">Advanced Web Development</span>.
              </p>
              <span className="text-[9px] text-slate-400 font-semibold block mt-1">1 hour ago</span>
            </div>

            <div className="relative">
              <span className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-4 ring-amber-50"></span>
              <p className="text-xs font-bold text-slate-700">System Backup</p>
              <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed mt-0.5">
                MongoDB databases local replica set synchronized successfully.
              </p>
              <span className="text-[9px] text-slate-400 font-semibold block mt-1">4 hours ago</span>
            </div>

            <div className="relative">
              <span className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 bg-blue-500 rounded-full ring-4 ring-blue-50"></span>
              <p className="text-xs font-bold text-slate-700">Course AI-401 Finalized</p>
              <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed mt-0.5">
                Grading matrix for AI foundations syllabus has been published.
              </p>
              <span className="text-[9px] text-slate-400 font-semibold block mt-1">Yesterday</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
