import React, { useState, useEffect } from "react";
import parentService from "../../../services/parentService";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Avatar from "../../../components/common/Avatar";
import { UserCheck, BookOpen, GraduationCap, AlertCircle, RefreshCw } from "lucide-react";

export default function Children() {
  const [children, setChildren] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchChildren = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await parentService.getMyChildren();
      const list = response?.data || response || [];
      setChildren(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể tải danh sách con em.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-indigo-900 via-primary-dark to-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md">
              Hồ sơ học tập
            </span>
          </div>
          <h1 className="text-2xl font-bold font-outfit">Danh sách con em liên kết</h1>
          <p className="text-neutral-200 text-xs mt-1">
            Quản lý thông tin học tập, lớp học và tiến trình của các con trong hệ thống EduLMS
          </p>
        </div>
        <button
          onClick={fetchChildren}
          disabled={isLoading}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-md transition self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2].map((n) => (
            <div key={n} className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm animate-pulse space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-neutral-200 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                  <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-10 bg-neutral-100 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : children.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-neutral-300">
          <GraduationCap className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
          <h3 className="text-base font-bold text-neutral-800">Chưa có thông tin con em liên kết</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
            Tài khoản phụ huynh của bạn chưa được liên kết với học sinh nào trong hệ thống. Vui lòng liên hệ Nhà trường hoặc Quản trị viên để cấp quyền truy cập.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {children.map((child) => (
            <Card key={child._id} className="p-6 hover:shadow-xl transition-all duration-300 border-neutral-200/80 flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <Avatar
                    name={child.name}
                    email={child.email}
                    size="lg"
                    className="ring-2 ring-primary/20 group-hover:ring-primary transition"
                  />
                  <Badge role="student">Học Sinh</Badge>
                </div>

                <h3 className="text-lg font-bold font-outfit text-neutral-900 group-hover:text-primary transition">
                  {child.name}
                </h3>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">{child.email}</p>

                <div className="mt-5 space-y-2.5 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 font-medium">Mã số học sinh:</span>
                    <span className="font-mono font-bold text-primary bg-primary-light px-2 py-0.5 rounded">
                      {child.studentCode || "Chưa cấp"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-200/60 pt-2">
                    <span className="text-neutral-500 font-medium">Lớp học hiện tại:</span>
                    <span className="font-bold text-neutral-800">
                      {child.classRef?.name ? `Lớp ${child.classRef.name}` : "Chưa xếp lớp"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-200/60 pt-2">
                    <span className="text-neutral-500 font-medium">Trạng thái:</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                      <UserCheck className="w-3.5 h-3.5" />
                      {child.isActivated ? "Đang học" : "Chưa kích hoạt"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
