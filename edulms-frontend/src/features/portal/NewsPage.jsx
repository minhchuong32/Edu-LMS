import React from 'react'
import { Newspaper, Calendar, ExternalLink } from 'lucide-react'

export const NewsPage = () => {
  const articles = [
    {
      id: 1,
      title: 'Thông tư mới về đánh giá, xếp loại học sinh THPT năm học 2026-2027',
      category: 'Thông báo chính thức',
      date: '05/10/2026',
      summary: 'Bộ Giáo dục và Đào tạo ban hành quy định mới về việc đánh giá điểm rèn luyện và kết quả học tập số hóa.',
    },
    {
      id: 2,
      title: 'Kế hoạch tổ chức kỳ thi Tin học trẻ & Đổi mới sáng tạo',
      category: 'Kế hoạch nhà trường',
      date: '01/10/2026',
      summary: 'Nhà trường thông báo phát động cuộc thi sáng tạo khoa học kỹ thuật dành cho học sinh các khối 10, 11 và 12.',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cổng Thông Tin & Tin Tức Giáo Dục</h1>
        <p className="text-xs text-slate-500 mt-1">Cập nhật tin tức, quy định và thông báo mới nhất từ Bộ GD&ĐT và Nhà trường</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {articles.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 font-semibold rounded-md">{item.category}</span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {item.date}
                </span>
              </div>
              <h3 className="font-bold text-slate-800 text-base leading-snug">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.summary}</p>
            </div>
            <button className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>Đọc chi tiết</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NewsPage
