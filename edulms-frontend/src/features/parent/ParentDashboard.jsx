import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  Eye,
  Lock,
  RefreshCw,
  AlertCircle,
  User,
  Users,
  ShieldCheck,
  GraduationCap,
  Mail,
  Building2,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { useAuth } from '@/context/useAuth'
import parentApi from '@/api/parentApi'
import gradebookApi from '@/api/gradebookApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import {
  GRADE_COLUMN_DEFINITIONS,
  calculateRowWeightedAverage,
  calculateOverallGPA,
  classifyAcademicPerformance,
} from '@/utils/gradeCalculator'

const SEMESTER_OPTIONS = [
  { value: 'ALL', label: 'Cả năm / Tất cả học kỳ' },
  { value: 'HK1', label: 'Học kỳ 1 (HK1)' },
  { value: 'HK2', label: 'Học kỳ 2 (HK2)' },
]

/**
 * Định dạng thời gian hiển thị tiếng Việt
 */
const formatDateTime = (dateInput) => {
  if (!dateInput) return '---'
  const d = new Date(dateInput)
  if (Number.isNaN(d.getTime())) return '---'
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Màu sắc badge xếp loại học lực
 */
const getPerformanceBadgeClass = (performance) => {
  switch (performance) {
    case 'Xuất sắc':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'Giỏi':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'Khá':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'Trung bình':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'Yếu':
    case 'Kém':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

/**
 * Màu sắc ô điểm thành phần
 */
const getScorePillClass = (score) => {
  const num = Number(score)
  if (Number.isNaN(num)) return 'bg-slate-100 text-slate-600 border-slate-200'
  if (num >= 8.0) return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (num >= 6.5) return 'bg-blue-50 text-blue-800 border-blue-200'
  if (num >= 5.0) return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-red-50 text-red-800 border-red-200'
}

/**
 * Nhãn phân loại thông báo
 */
const getNotificationTypeBadge = (type) => {
  switch (type) {
    case 'assignment_graded':
      return {
        label: 'Thông báo Điểm bài tập',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      }
    case 'assignment_created':
      return {
        label: 'Bài tập mới từ Giáo viên',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
      }
    case 'system':
      return {
        label: 'Thông báo Nhà trường',
        className: 'bg-purple-100 text-purple-800 border-purple-200',
      }
    default:
      return {
        label: 'Thông báo Giáo viên / Trường',
        className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      }
  }
}

/**
 * Trích xuất danh sách ID học sinh được phép truy cập từ user.childrenRefs
 */
const extractAuthorizedChildIds = (user) => {
  if (!user) return []
  const rawRefs =
    user.childrenRefs ||
    user.children ||
    (user.childId ? [user.childId] : []) ||
    []
  if (!Array.isArray(rawRefs)) return []
  return rawRefs
    .map((item) => (typeof item === 'object' ? item?._id || item?.id : item))
    .filter(Boolean)
    .map(String)
}

/**
 * Cổng thông tin Phụ huynh (Parent Portal - ParentDashboard)
 * - Hỗ trợ Phụ huynh có một hoặc nhiều học sinh được liên kết trong `childrenRefs`
 * - Nếu có nhiều học sinh (> 1), hiển thị Dropdown để Phụ huynh lựa chọn học sinh cần xem
 * - Hiển thị thông tin chi tiết của học sinh đang được chọn (Họ tên, Mã HS, Lớp, Phòng học, GVCN)
 * - Cung cấp 2 Tab:
 *    1. Tab "Điểm số": Theo dõi kết quả học tập, điểm từng môn học và điểm tổng kết (GPA & Học lực)
 *    2. Tab "Thông báo": Theo dõi thông báo từ nhà trường và giáo viên
 * - Chế độ Chỉ đọc (Read-only) tuyệt đối: ẩn toàn bộ nút Thêm / Sửa / Xóa
 * - Kiểm tra quyền truy cập dữ liệu theo `childrenRefs` ở cả Frontend và Backend
 */
export const ParentDashboard = () => {
  const { user } = useAuth()
  const userChildrenRefIds = useMemo(
    () => extractAuthorizedChildIds(user),
    [user]
  )

  // Danh sách học sinh được liên kết với tài khoản Phụ huynh
  const [childrenList, setChildrenList] = useState([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [loadingChildren, setLoadingChildren] = useState(true)
  const [childrenError, setChildrenError] = useState(null)

  // Dữ liệu chi tiết (Điểm số + Thông báo) của học sinh đang được chọn
  const [activeTab, setActiveTab] = useState('grades') // 'grades' | 'notifications'
  const [semesterFilter, setSemesterFilter] = useState('ALL')
  const [notificationFilter, setNotificationFilter] = useState('ALL')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState(null)

  const [childProfile, setChildProfile] = useState(null)
  const [childGrades, setChildGrades] = useState({
    currentGPA: null,
    academicPerformance: 'Chưa xếp loại',
    subjects: [],
    records: [],
  })
  const [childNotifications, setChildNotifications] = useState([])
  const [reloadKey, setReloadKey] = useState(0)

  // 1. Tải danh sách các con được liên kết với tài khoản Phụ huynh (childrenRefs)
  useEffect(() => {
    let ignore = false

    const loadLinkedChildren = async () => {
      setLoadingChildren(true)
      setChildrenError(null)

      try {
        if (typeof parentApi.getLinkedChildren === 'function') {
          const res = await parentApi.getLinkedChildren()
          const payload = res?.data || res || {}
          const rawChildren = Array.isArray(payload.children)
            ? payload.children
            : Array.isArray(payload)
              ? payload
              : []

          if (!ignore) {
            // Kiểm tra quyền truy cập ở Frontend: nếu user.childrenRefs có khai báo danh sách ID, chỉ giữ lại các học sinh thuộc childrenRefs
            const authorizedChildren =
              userChildrenRefIds.length > 0
                ? rawChildren.filter((child) =>
                    userChildrenRefIds.includes(
                      String(child._id || child.id || '')
                    )
                  )
                : rawChildren

            setChildrenList(authorizedChildren)
            setSelectedChildId((prevId) => {
              if (
                prevId &&
                authorizedChildren.some(
                  (c) => String(c._id || c.id) === String(prevId)
                )
              ) {
                return prevId
              }
              return authorizedChildren[0]
                ? String(authorizedChildren[0]._id || authorizedChildren[0].id)
                : ''
            })
          }
        } else if (!ignore && Array.isArray(user?.children)) {
          setChildrenList(user.children)
          setSelectedChildId(
            user.children[0]
              ? String(user.children[0]._id || user.children[0].id)
              : ''
          )
        }
      } catch (err) {
        if (!ignore) {
          setChildrenError(
            err?.message ||
              'Không thể tải danh sách học sinh được liên kết với tài khoản Phụ huynh.'
          )
        }
      } finally {
        if (!ignore) {
          setLoadingChildren(false)
        }
      }
    }

    loadLinkedChildren()
    return () => {
      ignore = true
    }
  }, [userChildrenRefIds, user?.children, reloadKey])

  // Tập hợp ID các học sinh hợp lệ mà Phụ huynh được phép xem
  const allowedChildIdSet = useMemo(() => {
    const ids = new Set(userChildrenRefIds)
    childrenList.forEach((c) => {
      const cId = c?._id || c?.id
      if (cId) ids.add(String(cId))
    })
    return ids
  }, [userChildrenRefIds, childrenList])

  // Thông tin tóm tắt của học sinh đang chọn từ danh sách
  const selectedChildFromList = useMemo(() => {
    if (!selectedChildId) return null
    return (
      childrenList.find(
        (c) => String(c._id || c.id) === String(selectedChildId)
      ) || null
    )
  }, [childrenList, selectedChildId])

  // 2. Khi chuyển đổi học sinh (selectedChildId) hoặc học kỳ, tải chính xác Điểm số & Thông báo của học sinh đó
  useEffect(() => {
    let ignore = false

    const loadSelectedChildData = async () => {
      if (!selectedChildId) {
        setChildProfile(null)
        setChildGrades({
          currentGPA: null,
          academicPerformance: 'Chưa xếp loại',
          subjects: [],
          records: [],
        })
        setChildNotifications([])
        return
      }

      // Kiểm tra phân quyền tại Frontend: từ chối nếu selectedChildId không nằm trong danh sách childrenRefs
      if (
        allowedChildIdSet.size > 0 &&
        !allowedChildIdSet.has(String(selectedChildId))
      ) {
        setDetailError(
          'Bạn không có quyền truy cập dữ liệu của học sinh không nằm trong danh sách con được liên kết (childrenRefs)!'
        )
        setChildProfile(null)
        setChildGrades({
          currentGPA: null,
          academicPerformance: 'Chưa xếp loại',
          subjects: [],
          records: [],
        })
        setChildNotifications([])
        return
      }

      setLoadingDetail(true)
      setDetailError(null)

      try {
        const queryParams =
          semesterFilter !== 'ALL' ? { semester: semesterFilter } : {}

        // Gọi API lấy thông tin tổng hợp (Điểm số + Thông báo) của học sinh được chọn
        const [overviewRes, notifRes] = await Promise.all([
          typeof parentApi.getChildOverview === 'function'
            ? parentApi.getChildOverview(selectedChildId, queryParams)
            : Promise.resolve(null),
          typeof parentApi.getChildNotifications === 'function'
            ? parentApi
                .getChildNotifications(selectedChildId)
                .catch(() => null)
            : Promise.resolve(null),
        ])

        if (ignore) return

        const overviewData = overviewRes?.data || overviewRes || null
        const notifData = notifRes?.data || notifRes || null

        if (overviewData && (overviewData.student || overviewData.grades)) {
          // Kiểm tra chéo ID học sinh trong response phải khớp với selectedChildId
          const returnedStudentId =
            overviewData.student?._id || overviewData.studentId || selectedChildId
          if (String(returnedStudentId) !== String(selectedChildId)) {
            setDetailError(
              'Dữ liệu phản hồi không khớp với học sinh được chọn trong childrenRefs!'
            )
            setLoadingDetail(false)
            return
          }

          setChildProfile(overviewData.student || selectedChildFromList)

          const rawSubjects = Array.isArray(overviewData.grades?.subjects)
            ? overviewData.grades.subjects
            : []
          const rawRecords = Array.isArray(overviewData.grades?.records)
            ? overviewData.grades.records
            : []

          const computedGPA =
            overviewData.grades?.currentGPA ??
            calculateOverallGPA(
              rawSubjects.map((s) => ({
                subjectName: s.subjectName,
                average: s.average,
              }))
            )

          setChildGrades({
            currentGPA: computedGPA,
            academicPerformance:
              overviewData.grades?.academicPerformance ||
              classifyAcademicPerformance(computedGPA),
            subjects: rawSubjects,
            records: rawRecords,
          })

          const listNotifs = Array.isArray(notifData?.notifications)
            ? notifData.notifications
            : Array.isArray(overviewData.notifications)
              ? overviewData.notifications
              : []

          setChildNotifications(listNotifs)
          setLoadingDetail(false)
          return
        }

        // Fallback dự phòng qua gradebookApi nếu getChildOverview chưa trả dữ liệu
        if (typeof gradebookApi?.getGradeRecords === 'function') {
          const gbRes = await gradebookApi.getGradeRecords({
            student: selectedChildId,
            ...(semesterFilter !== 'ALL' ? { semester: semesterFilter } : {}),
          })
          if (ignore) return

          const gbData = gbRes?.data || gbRes || {}
          const records = Array.isArray(gbData.records) ? gbData.records : []
          const subjectMap = new Map()

          records.forEach((rec) => {
            const subObj = rec.teachingAssignment?.subject || {}
            const subId = String(
              subObj._id || rec.teachingAssignment?._id || 'sub'
            )
            const subName = subObj.name || 'Môn học'
            const subCode = subObj.code || '---'
            if (!subjectMap.has(subId)) {
              subjectMap.set(subId, {
                subjectId: subId,
                subjectName: subName,
                subjectCode: subCode,
                teacherName:
                  rec.teachingAssignment?.teacher?.fullName ||
                  'Giáo viên bộ môn',
                records: [],
              })
            }
            subjectMap.get(subId).records.push(rec)
          })

          const builtSubjects = []
          subjectMap.forEach((grp) => {
            const avg = calculateRowWeightedAverage(grp.records)
            builtSubjects.push({
              ...grp,
              average: avg,
              academicPerformance: classifyAcademicPerformance(avg),
            })
          })

          const gpa = calculateOverallGPA(builtSubjects)
          setChildProfile(selectedChildFromList)
          setChildGrades({
            currentGPA: gpa,
            academicPerformance: classifyAcademicPerformance(gpa),
            subjects: builtSubjects,
            records,
          })
          setChildNotifications(
            Array.isArray(notifData?.notifications)
              ? notifData.notifications
              : []
          )
        }
      } catch (err) {
        if (!ignore) {
          setDetailError(
            err?.message ||
              'Không thể tải dữ liệu điểm số và thông báo của học sinh này.'
          )
        }
      } finally {
        if (!ignore) {
          setLoadingDetail(false)
        }
      }
    }

    loadSelectedChildData()
    return () => {
      ignore = true
    }
  }, [
    selectedChildId,
    semesterFilter,
    allowedChildIdSet,
    selectedChildFromList,
    reloadKey,
  ])

  // Xử lý khi Phụ huynh chọn học sinh khác từ Dropdown
  const handleSelectChild = (newStudentId) => {
    if (!newStudentId) return
    if (
      allowedChildIdSet.size > 0 &&
      !allowedChildIdSet.has(String(newStudentId))
    ) {
      setDetailError(
        'Bạn không có quyền xem thông tin của học sinh ngoài danh sách liên kết (childrenRefs)!'
      )
      return
    }
    setDetailError(null)
    setSelectedChildId(String(newStudentId))
  }

  // Thông tin hiển thị của học sinh đang chọn
  const activeStudent = childProfile || selectedChildFromList

  // Lọc danh sách thông báo theo loại
  const filteredNotifications = useMemo(() => {
    if (notificationFilter === 'ALL') return childNotifications
    return childNotifications.filter((n) => n.type === notificationFilter)
  }, [childNotifications, notificationFilter])

  // Gom điểm thành phần của từng môn học theo các cột chuẩn (Miệng, 15 phút, 1 tiết, Giữa kỳ, Cuối kỳ)
  const formattedSubjectRows = useMemo(() => {
    return (childGrades.subjects || []).map((subject) => {
      const scoresByType = {
        oral: [],
        '15min': [],
        regular: [],
        '45min': [],
        midterm: [],
        final: [],
      }

      ;(subject.records || []).forEach((rec) => {
        const rawType = String(rec.gradeType || '').toLowerCase()
        if (scoresByType[rawType]) {
          scoresByType[rawType].push(rec)
        }
      })

      const computedAvg =
        typeof subject.average === 'number'
          ? subject.average
          : calculateRowWeightedAverage(subject.records || [])

      return {
        ...subject,
        scoresByType,
        average: computedAvg,
        academicPerformance:
          subject.academicPerformance ||
          classifyAcademicPerformance(computedAvg),
      }
    })
  }, [childGrades.subjects])

  return (
    <div className="space-y-6">
      {/* 1. Header Cổng Phụ Huynh & Chỉ báo Chế độ Chỉ Đọc (Read-Only) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Cổng Phụ Huynh Học Sinh
            </h1>
            <span
              data-testid="parent-readonly-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
            >
              <Lock className="w-3 h-3 text-amber-600" />
              <Eye className="w-3 h-3 text-amber-600" />
              <span>Chế độ chỉ đọc (Read-only)</span>
            </span>
            <span
              data-testid="parent-linked-count-badge"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Học sinh liên kết: {childrenList.length}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Đồng hành và theo dõi kết quả học tập, bảng điểm các môn học và
            thông báo từ nhà trường, giáo viên của con em
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            data-testid="refresh-parent-portal-btn"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loadingChildren || loadingDetail}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loadingChildren || loadingDetail ? 'animate-spin' : ''
              }`}
            />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </div>

      {/* 2. Trạng thái Loading / Error / Empty khi tải danh sách học sinh được liên kết */}
      {loadingChildren ? (
        <div
          data-testid="parent-children-loading"
          className="bg-white p-12 rounded-2xl border border-slate-200 shadow-xs flex justify-center"
        >
          <LoadingSpinner
            size="md"
            message="Đang tải danh sách học sinh được liên kết với tài khoản Phụ huynh..."
          />
        </div>
      ) : childrenError ? (
        <div
          data-testid="parent-portal-error"
          className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{childrenError}</span>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-red-200 text-red-700 font-bold hover:bg-red-100 transition-colors self-start sm:self-auto"
          >
            Thử lại
          </button>
        </div>
      ) : childrenList.length === 0 ? (
        <div
          data-testid="parent-no-children-empty"
          className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-2"
        >
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="text-sm font-bold text-slate-800">
            Chưa có học sinh nào được liên kết với tài khoản của bạn
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Vui lòng liên hệ Quản trị viên nhà trường hoặc Giáo viên chủ nhiệm
            để cập nhật liên kết Phụ huynh – Học sinh (`childrenRefs`).
          </p>
        </div>
      ) : (
        <>
          {/* 3. Khu vực Chọn Học sinh (Dropdown khi có nhiều học sinh) & Thẻ Thông tin Học sinh đang chọn */}
          <div
            data-testid="selected-child-info-card"
            className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5"
          >
            {/* Thanh chọn học sinh: hiển thị Dropdown khi Phụ huynh có nhiều học sinh (> 1) */}
            {childrenList.length > 1 && (
              <div
                data-testid="parent-child-selector-bar"
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Users className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Tài khoản của bạn đang liên kết với{' '}
                    <strong className="text-blue-700">
                      {childrenList.length} học sinh
                    </strong>
                    . Chọn học sinh cần theo dõi:
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label
                    htmlFor="parent-child-select"
                    className="sr-only"
                  >
                    Chọn học sinh cần xem
                  </label>
                  <select
                    id="parent-child-select"
                    data-testid="parent-child-select-dropdown"
                    aria-label="Chọn học sinh cần xem"
                    value={selectedChildId}
                    onChange={(e) => handleSelectChild(e.target.value)}
                    className="w-full sm:w-72 px-3.5 py-2 text-xs font-bold text-slate-800 bg-blue-50/60 border border-blue-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {childrenList.map((child) => {
                      const cId = String(child._id || child.id)
                      return (
                        <option key={cId} value={cId}>
                          {child.fullName} — Lớp {child.className || '---'} (
                          {child.userCode || '---'})
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
            )}

            {/* Thông tin chi tiết của học sinh đang được chọn */}
            {activeStudent && (
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold flex items-center justify-center text-lg shadow-xs shrink-0">
                    {(activeStudent.fullName || 'H')
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2
                        data-testid="selected-child-name"
                        className="text-base sm:text-lg font-extrabold text-slate-900"
                      >
                        Học sinh: {activeStudent.fullName}
                      </h2>
                      <span
                        data-testid="selected-child-code"
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        Mã HS: {activeStudent.userCode || '---'}
                      </span>
                    </div>

                    <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-slate-600">
                      <span
                        data-testid="selected-child-class"
                        className="inline-flex items-center gap-1 font-semibold text-slate-800"
                      >
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                        <span>Lớp: {activeStudent.className || '---'}</span>
                      </span>

                      {activeStudent.room && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Phòng: {activeStudent.room}</span>
                        </span>
                      )}

                      {activeStudent.academicYear && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Năm học: {activeStudent.academicYear}</span>
                        </span>
                      )}

                      {activeStudent.homeroomTeacher?.fullName && (
                        <span
                          data-testid="selected-child-homeroom-teacher"
                          className="inline-flex items-center gap-1"
                        >
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          <span>
                            GVCN: {activeStudent.homeroomTeacher.fullName}
                          </span>
                        </span>
                      )}

                      {activeStudent.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{activeStudent.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3 Thẻ chỉ số tổng kết nhanh của học sinh đang chọn */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:w-auto">
                  <div className="px-4 py-3 rounded-xl bg-blue-50/70 border border-blue-200 min-w-[140px]">
                    <span className="text-[11px] font-bold uppercase text-blue-700">
                      Điểm TB Tổng kết
                    </span>
                    <p
                      data-testid="selected-child-gpa"
                      className="text-xl font-extrabold text-blue-800 mt-0.5"
                    >
                      {typeof childGrades.currentGPA === 'number'
                        ? `${childGrades.currentGPA.toFixed(1)} / 10`
                        : '-- / 10'}
                    </p>
                  </div>

                  <div className="px-4 py-3 rounded-xl bg-emerald-50/70 border border-emerald-200 min-w-[140px]">
                    <span className="text-[11px] font-bold uppercase text-emerald-800">
                      Xếp loại Học lực
                    </span>
                    <p
                      data-testid="selected-child-performance"
                      className="text-base font-extrabold text-emerald-700 mt-1"
                    >
                      {childGrades.academicPerformance || 'Chưa xếp loại'}
                    </p>
                  </div>

                  <div className="px-4 py-3 rounded-xl bg-violet-50/70 border border-violet-200 min-w-[140px]">
                    <span className="text-[11px] font-bold uppercase text-violet-800">
                      Thông báo mới
                    </span>
                    <p
                      data-testid="selected-child-notification-count"
                      className="text-xl font-extrabold text-violet-700 mt-0.5"
                    >
                      {childNotifications.length} thông báo
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Thông báo lỗi khi tải chi tiết học sinh (hoặc lỗi phân quyền childrenRefs) */}
          {detailError && (
            <div
              data-testid="parent-detail-error"
              className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{detailError}</span>
              </div>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="underline font-bold hover:text-red-900"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* 4. Thanh điều hướng 2 Tab: "Điểm số" & "Thông báo" */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-200 bg-slate-50/60">
              <div
                role="tablist"
                aria-label="Các mục theo dõi của Phụ huynh"
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'grades'}
                  data-testid="parent-tab-grades"
                  onClick={() => setActiveTab('grades')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'grades'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Điểm số ({formattedSubjectRows.length} môn)</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'notifications'}
                  data-testid="parent-tab-notifications"
                  onClick={() => setActiveTab('notifications')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'notifications'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>Thông báo ({childNotifications.length})</span>
                </button>
              </div>

              {/* Bộ lọc phụ theo từng Tab */}
              {activeTab === 'grades' ? (
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    data-testid="parent-semester-filter"
                    aria-label="Lọc theo học kỳ"
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {SEMESTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    data-testid="parent-notification-type-filter"
                    aria-label="Lọc loại thông báo"
                    value={notificationFilter}
                    onChange={(e) => setNotificationFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">
                      Tất cả thông báo ({childNotifications.length})
                    </option>
                    <option value="assignment_graded">
                      Thông báo chấm điểm bài tập
                    </option>
                    <option value="system">Thông báo từ Nhà trường</option>
                    <option value="general">Thông báo chung từ Giáo viên</option>
                  </select>
                </div>
              )}
            </div>

            {/* Nội dung của Tab đang chọn */}
            <div className="p-5">
              {loadingDetail ? (
                <div
                  data-testid="parent-detail-loading"
                  className="py-12 flex justify-center"
                >
                  <LoadingSpinner
                    size="md"
                    message={`Đang tải dữ liệu ${
                      activeTab === 'grades' ? 'điểm số' : 'thông báo'
                    } của học sinh...`}
                  />
                </div>
              ) : activeTab === 'grades' ? (
                /* =========================================================
                   TAB 1: ĐIỂM SỐ (CHỈ ĐỌC - THEO DÕI ĐIỂM TỪNG MÔN & TỔNG KẾT)
                ========================================================= */
                <div data-testid="parent-grades-tab-panel" className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Bảng điểm các môn học & điểm tổng kết của{' '}
                        <span className="text-blue-700">
                          {activeStudent?.fullName || 'Học sinh'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Điểm trung bình môn được tính tự động theo hệ số (Hệ số
                        1: Miệng, 15 phút • Hệ số 2: 1 tiết, Giữa kỳ • Hệ số 3:
                        Cuối kỳ)
                      </p>
                    </div>

                    <Link
                      to={`/parent/grades?studentId=${selectedChildId}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 self-start sm:self-auto"
                    >
                      <span>Xem biểu đồ xu hướng điểm</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {formattedSubjectRows.length === 0 ? (
                    <div
                      data-testid="parent-grades-empty"
                      className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1.5"
                    >
                      <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">
                        Chưa có dữ liệu điểm số cho học sinh này trong học kỳ
                        đang chọn
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Điểm số sẽ được hiển thị ngay khi giáo viên bộ môn cập
                        nhật sổ điểm.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Bảng điểm trên Desktop (ẩn trên màn hình nhỏ, có thanh cuộn ngang an toàn) */}
                      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                        <table
                          data-testid="parent-grades-table"
                          className="w-full text-xs text-left border-collapse"
                        >
                          <thead>
                            <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                              <th className="py-3 px-4 font-bold">Môn học</th>
                              {GRADE_COLUMN_DEFINITIONS.map((col) => (
                                <th
                                  key={col.key || col.gradeType}
                                  className="py-3 px-3 font-bold text-center"
                                >
                                  <div>{col.shortLabel}</div>
                                  <div className="text-[10px] font-normal text-slate-500">
                                    HS {col.defaultWeight}
                                  </div>
                                </th>
                              ))}
                              <th className="py-3 px-4 font-bold text-center bg-blue-50/60 text-blue-900">
                                ĐTB Môn
                              </th>
                              <th className="py-3 px-4 font-bold text-center">
                                Xếp loại
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {formattedSubjectRows.map((sub) => (
                              <tr
                                key={sub.subjectId || sub.subjectName}
                                data-testid={`parent-grade-row-${
                                  sub.subjectId || sub.subjectName
                                }`}
                                className="hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">
                                    {sub.subjectName}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Mã: {sub.subjectCode || '---'} • GV:{' '}
                                    {sub.teacherName || 'Giáo viên bộ môn'}
                                  </div>
                                </td>

                                {GRADE_COLUMN_DEFINITIONS.map((col) => {
                                  const colKey = col.key || col.gradeType
                                  const list = sub.scoresByType?.[colKey] || []
                                  return (
                                    <td
                                      key={colKey}
                                      className="py-3 px-3 text-center"
                                    >
                                      {list.length === 0 ? (
                                        <span className="text-slate-300">
                                          —
                                        </span>
                                      ) : (
                                        <div className="inline-flex flex-wrap items-center justify-center gap-1">
                                          {list.map((rec, idx) => (
                                            <span
                                              key={rec._id || idx}
                                              className={`px-2 py-0.5 rounded-md text-xs font-bold border ${getScorePillClass(
                                                rec.value
                                              )}`}
                                            >
                                              {Number(rec.value).toFixed(1)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                  )
                                })}

                                <td className="py-3.5 px-4 text-center bg-blue-50/30">
                                  <strong
                                    data-testid={`parent-subject-avg-${
                                      sub.subjectId || sub.subjectName
                                    }`}
                                    className="text-sm font-extrabold text-blue-700"
                                  >
                                    {typeof sub.average === 'number'
                                      ? sub.average.toFixed(1)
                                      : '--'}
                                  </strong>
                                </td>

                                <td className="py-3.5 px-4 text-center">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getPerformanceBadgeClass(
                                      sub.academicPerformance
                                    )}`}
                                  >
                                    {sub.academicPerformance}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-blue-50/70 border-t-2 border-blue-200 font-bold text-slate-900">
                              <td
                                colSpan={GRADE_COLUMN_DEFINITIONS.length + 1}
                                className="py-3.5 px-4 text-right text-xs uppercase tracking-wider text-blue-900"
                              >
                                Điểm trung bình tổng kết hiện tại (GPA):
                              </td>
                              <td
                                data-testid="parent-table-overall-gpa"
                                className="py-3.5 px-4 text-center text-base font-extrabold text-blue-800"
                              >
                                {typeof childGrades.currentGPA === 'number'
                                  ? childGrades.currentGPA.toFixed(1)
                                  : '--'}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getPerformanceBadgeClass(
                                    childGrades.academicPerformance
                                  )}`}
                                >
                                  {childGrades.academicPerformance}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Danh sách Card Điểm từng môn trên Mobile (Responsive < md) */}
                      <div
                        data-testid="parent-grades-mobile-cards"
                        className="md:hidden space-y-3"
                      >
                        {formattedSubjectRows.map((sub) => (
                          <div
                            key={sub.subjectId || sub.subjectName}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <h4 className="text-xs font-extrabold text-slate-900">
                                  {sub.subjectName}
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                  GV: {sub.teacherName || 'Giáo viên bộ môn'}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-extrabold text-blue-700">
                                  ĐTB:{' '}
                                  {typeof sub.average === 'number'
                                    ? sub.average.toFixed(1)
                                    : '--'}
                                </span>
                                <div className="mt-0.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPerformanceBadgeClass(
                                      sub.academicPerformance
                                    )}`}
                                  >
                                    {sub.academicPerformance}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
                              {GRADE_COLUMN_DEFINITIONS.map((col) => {
                                const colKey = col.key || col.gradeType
                                const list = sub.scoresByType?.[colKey] || []
                                return (
                                  <div
                                    key={colKey}
                                    className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80"
                                  >
                                    <span className="text-slate-500">
                                      {col.shortLabel}:
                                    </span>
                                    <strong className="text-slate-800">
                                      {list.length > 0
                                        ? list
                                            .map((r) =>
                                              Number(r.value).toFixed(1)
                                            )
                                            .join(', ')
                                        : '—'}
                                    </strong>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* =========================================================
                   TAB 2: THÔNG BÁO (THEO DÕI THÔNG BÁO TỪ NHÀ TRƯỜNG & GIÁO VIÊN)
                ========================================================= */
                <div
                  data-testid="parent-notifications-tab-panel"
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Thông báo từ Nhà trường & Giáo viên dành cho{' '}
                      <span className="text-blue-700">
                        {activeStudent?.fullName || 'Học sinh'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Cập nhật kết quả chấm bài, nhận xét của giáo viên bộ môn và
                      các thông báo học vụ
                    </p>
                  </div>

                  {filteredNotifications.length === 0 ? (
                    <div
                      data-testid="parent-notifications-empty"
                      className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1.5"
                    >
                      <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">
                        Chưa có thông báo nào cho học sinh này
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Khi nhà trường hoặc giáo viên gửi thông báo mới, nội
                        dung sẽ xuất hiện tại đây.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredNotifications.map((notif, idx) => {
                        const nId = notif._id || notif.id || idx
                        const typeBadge = getNotificationTypeBadge(notif.type)
                        const senderName =
                          notif.sender?.fullName ||
                          (notif.type === 'system'
                            ? 'Ban Giám hiệu / Nhà trường'
                            : 'Giáo viên bộ môn')

                        return (
                          <div
                            key={nId}
                            data-testid={`parent-notification-item-${nId}`}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-blue-200 transition-all space-y-2"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeBadge.className}`}
                                >
                                  {typeBadge.label}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-600">
                                  Người gửi: <strong>{senderName}</strong>
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {formatDateTime(notif.createdAt)}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-slate-900">
                              {notif.title}
                            </h4>

                            <p className="text-xs text-slate-700 leading-relaxed">
                              {notif.message}
                            </p>

                            {(notif.metadata?.score !== undefined &&
                              notif.metadata?.score !== null) ||
                            notif.submission?.score !== undefined ? (
                              <div className="pt-2 border-t border-slate-200/70 flex items-center gap-3 flex-wrap text-[11px]">
                                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                                  Điểm đạt được:{' '}
                                  {notif.metadata?.score ??
                                    notif.submission?.score}
                                  /10
                                </span>
                                {(notif.metadata?.feedback ||
                                  notif.submission?.feedback) && (
                                  <span className="text-slate-600 italic">
                                    Nhận xét: &ldquo;
                                    {notif.metadata?.feedback ||
                                      notif.submission?.feedback}
                                    &rdquo;
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ParentDashboard
