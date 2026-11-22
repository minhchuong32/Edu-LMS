import { useState, useEffect, useRef, useCallback } from 'react'
import examApi from '../../../api/examApi'

const LS_KEY = (examId) => `exam_session_${examId}`

/**
 * Lấy session đã lưu từ localStorage (hỗ trợ reload trang)
 */
function loadSession(examId) {
  try {
    const raw = localStorage.getItem(LS_KEY(examId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Lưu session vào localStorage
 */
function saveSession(examId, data) {
  try {
    localStorage.setItem(LS_KEY(examId), JSON.stringify(data))
  } catch {
    // ignore quota errors
  }
}

/**
 * Xoá session khỏi localStorage sau khi nộp
 */
function clearSession(examId) {
  try {
    localStorage.removeItem(LS_KEY(examId))
  } catch {
    // ignore
  }
}

/**
 * useExamSession — Custom hook quản lý toàn bộ logic phiên làm bài
 *
 * @param {string}   examId       ID đề kiểm tra
 * @param {Object}   exam         Dữ liệu đề (questions, duration, startAt/endAt)
 * @param {Function} onSubmitDone (result) => void  — callback khi nộp xong
 */
export default function useExamSession(examId, exam, onSubmitDone) {
  const [serverOffset, setServerOffset] = useState(0)
  const [startedAt, setStartedAt] = useState(() => {
    const saved = loadSession(examId)
    return saved?.startedAt ?? null
  })
  const [answers, setAnswers] = useState(() => {
    const saved = loadSession(examId)
    return saved?.answers ?? {}
  })
  const [timeLeft, setTimeLeft] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const hasAutoSubmitted = useRef(false)
  const submitRef = useRef(null)

  // 1. Fetch server time để tính serverOffset & khởi tạo startedAt nếu chưa có
  useEffect(() => {
    if (!examId) return
    let isMounted = true

    examApi
      .getServerTime()
      .then((res) => {
        if (!isMounted) return
        const serverTime = res?.data?.data?.serverTime ?? Date.now()
        const offset = serverTime - Date.now()
        setServerOffset(offset)

        setStartedAt((prev) => {
          if (prev) return prev
          const nowWithOffset = Date.now() + offset
          saveSession(examId, {
            startedAt: nowWithOffset,
            answers: loadSession(examId)?.answers ?? {},
          })
          return nowWithOffset
        })
      })
      .catch(() => {
        if (!isMounted) return
        setStartedAt((prev) => {
          if (prev) return prev
          const now = Date.now()
          saveSession(examId, {
            startedAt: now,
            answers: loadSession(examId)?.answers ?? {},
          })
          return now
        })
      })

    return () => {
      isMounted = false
    }
  }, [examId])

  // 2. Chọn đáp án
  const selectAnswer = useCallback(
    (questionId, optionIndex) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: optionIndex }
        saveSession(examId, { startedAt, answers: next })
        return next
      })
    },
    [examId, startedAt]
  )

  // 3. Nộp bài
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)

    const serverNow = Date.now() + serverOffset
    const durationSpent = startedAt
      ? Math.max(0, Math.floor((serverNow - startedAt) / 1000))
      : 0

    const answersArray = Object.entries(answers).map(
      ([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      })
    )

    try {
      const res = await examApi.submitExam(examId, {
        answers: answersArray,
        durationSpent,
        startedAt: startedAt ? new Date(startedAt).toISOString() : undefined,
      })
      clearSession(examId)
      if (onSubmitDone) onSubmitDone(res?.data?.data)
    } catch (err) {
      const msg =
        err?.response?.data?.message ?? 'Nộp bài thất bại. Vui lòng thử lại.'
      setSubmitError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }, [answers, examId, isSubmitting, onSubmitDone, startedAt, serverOffset])

  // Cập nhật submitRef trong effect để dùng trong auto-submit
  useEffect(() => {
    submitRef.current = handleSubmit
  }, [handleSubmit])

  // 4. Đồng hồ đếm ngược
  useEffect(() => {
    if (!startedAt || !exam) return

    const durationSec = (exam.duration ?? 60) * 60

    const updateTimer = () => {
      const serverNow = Date.now() + serverOffset
      const elapsed = Math.floor((serverNow - startedAt) / 1000)
      const remaining = Math.max(0, durationSec - elapsed)
      setTimeLeft(remaining)

      if (remaining <= 0 && !hasAutoSubmitted.current) {
        hasAutoSubmitted.current = true
        if (submitRef.current) {
          submitRef.current()
        }
      }
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)

    return () => clearInterval(timer)
  }, [startedAt, exam, serverOffset])

  return {
    timeLeft: timeLeft ?? (exam?.duration ? exam.duration * 60 : 0),
    answers,
    selectAnswer,
    handleSubmit,
    isSubmitting,
    submitError,
    startedAt,
  }
}
