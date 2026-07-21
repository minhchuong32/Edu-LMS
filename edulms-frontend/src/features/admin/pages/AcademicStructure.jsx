import React from "react";
import PagePlaceholder from "../../../components/common/PagePlaceholder";

export default function AcademicStructure() {
  return (
    <PagePlaceholder
      title="Cơ cấu học vụ (Academic Structure)"
      desc="Quản lý cấu trúc tổ chức học thuật, khoa, ngành, bộ môn, khóa học và hệ thống đào tạo."
      badgeText="Academic Administration"
      badgeRole="Admin"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m-4 0h4" />
        </svg>
      }
    />
  );
}
