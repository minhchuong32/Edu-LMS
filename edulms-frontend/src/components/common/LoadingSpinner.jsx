import React from 'react'

export const LoadingSpinner = ({ fullScreen = false, text = 'Đang tải dữ liệu...' }) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium text-slate-600">{text}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  )
}

export default LoadingSpinner
