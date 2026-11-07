export const LoadingSpinner = ({ fullScreen = false, text, message }) => {
  const displayText = message || text || 'Đang tải dữ liệu...'

  if (fullScreen) {
    return (
      <div role="status" aria-label={displayText} className="fixed inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium text-slate-600">{displayText}</p>
      </div>
    )
  }

  return (
    <div role="status" aria-label={displayText} className="flex flex-col items-center justify-center p-8">
      <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
      <p className="text-xs text-slate-500">{displayText}</p>
    </div>
  )
}

export default LoadingSpinner
