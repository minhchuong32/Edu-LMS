import React from "react";
import PagePlaceholder from "../../../components/common/PagePlaceholder";

export default function Attendance() {
  return (
    <PagePlaceholder
      title="Điểm danh (Attendance)"
      desc="Quản lý việc điểm danh sinh viên trong từng buổi học, theo dõi tỷ lệ tham gia và vắng học."
      badgeText="Attendance Tracking"
      badgeRole="Teacher"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  );
}
