/**
 * Tiện ích xử lý và xác thực đường dẫn video YouTube (YouTube URL Helper)
 * Dự án: Edu-LMS (Hệ thống Quản lý Học tập THPT)
 *
 * Chức năng:
 * - Kiểm tra domain YouTube hợp lệ (youtube.com, youtu.be, m.youtube.com)
 * - Trích xuất Video ID (chuỗi 11 ký tự [a-zA-Z0-9_-]{11}) từ các dạng URL:
 *   + https://www.youtube.com/watch?v=VIDEO_ID
 *   + https://youtu.be/VIDEO_ID
 *   + https://www.youtube.com/embed/VIDEO_ID
 *   + https://www.youtube.com/shorts/VIDEO_ID
 *   + https://m.youtube.com/watch?v=VIDEO_ID
 * - Từ chối các URL ngoài YouTube, URL độc hại, script injection, iframe injection
 * - Chuẩn hóa và sinh đường dẫn embed an toàn: https://www.youtube.com/embed/VIDEO_ID
 */

// Danh sách các hostname YouTube được chấp nhận
const ALLOWED_YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

// Định dạng Video ID hợp lệ trong URL YouTube (từ 3 đến 30 ký tự an toàn)
const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

// Định dạng Video ID chuẩn (11 ký tự) khi người dùng nhập chuỗi bare ID không chứa URL
const BARE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Trích xuất YouTube Video ID từ chuỗi URL
 * @param {string} rawUrl - URL do người dùng cung cấp
 * @returns {string|null} - Video ID nếu hợp lệ, ngược lại trả về null
 */
const extractYouTubeVideoId = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }

  const trimmed = rawUrl.trim();

  // Ngăn chặn XSS, script injection hoặc dán mã HTML/iframe
  if (
    trimmed.includes("<") ||
    trimmed.includes(">") ||
    trimmed.toLowerCase().includes("javascript:") ||
    trimmed.toLowerCase().includes("<iframe")
  ) {
    return null;
  }

  // Trường hợp người dùng nhập trực tiếp Video ID (11 ký tự chuẩn, không có dấu / hoặc .)
  if (!trimmed.includes("/") && !trimmed.includes(".") && BARE_VIDEO_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    // Đảm bảo URL có protocol để URL constructor parse chính xác
    const urlString = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    const parsedUrl = new URL(urlString);
    const hostname = parsedUrl.hostname.toLowerCase();

    // 1. Kiểm tra hostname hợp lệ
    if (!ALLOWED_YOUTUBE_HOSTNAMES.has(hostname)) {
      return null;
    }

    let candidateId = null;

    // 2. Định dạng youtu.be/VIDEO_ID
    if (hostname === "youtu.be" || hostname === "www.youtu.be") {
      const pathname = parsedUrl.pathname.replace(/^\/+/, "");
      const segments = pathname.split("/");
      candidateId = segments[0] || null;
    } else {
      // 3. Định dạng youtube.com/watch?v=VIDEO_ID
      if (parsedUrl.pathname === "/watch") {
        candidateId = parsedUrl.searchParams.get("v");
      }
      // 4. Định dạng youtube.com/embed/VIDEO_ID hoặc /shorts/VIDEO_ID hoặc /v/VIDEO_ID
      else if (
        parsedUrl.pathname.startsWith("/embed/") ||
        parsedUrl.pathname.startsWith("/shorts/") ||
        parsedUrl.pathname.startsWith("/v/")
      ) {
        const segments = parsedUrl.pathname.split("/").filter(Boolean);
        candidateId = segments[1] || null;
      }
      // 5. Fallback nếu URL có query param 'v'
      else if (parsedUrl.searchParams.has("v")) {
        candidateId = parsedUrl.searchParams.get("v");
      }
    }

    // 6. Xác thực Video ID có đúng định dạng an toàn
    if (candidateId && YOUTUBE_VIDEO_ID_REGEX.test(candidateId)) {
      return candidateId;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Kiểm tra xem một URL có phải là URL video YouTube hợp lệ hay không
 * @param {string} url
 * @returns {boolean}
 */
const isValidYouTubeUrl = (url) => {
  return extractYouTubeVideoId(url) !== null;
};

/**
 * Tạo URL Embed chuẩn hóa từ Video ID
 * @param {string} videoId
 * @param {object} [options]
 * @returns {string}
 */
const formatYouTubeEmbedUrl = (videoId, options = {}) => {
  if (!videoId || !YOUTUBE_VIDEO_ID_REGEX.test(videoId)) {
    throw new Error("Video ID không hợp lệ để tạo YouTube Embed URL");
  }

  const params = new URLSearchParams();
  // Không tự động phát theo yêu cầu đề bài
  params.set("autoplay", options.autoplay ? "1" : "0");
  params.set("rel", "0"); // Không hiển thị video gợi ý ngoài kênh
  params.set("modestbranding", "1");

  const query = params.toString();
  return `https://www.youtube.com/embed/${videoId}${query ? `?${query}` : ""}`;
};

/**
 * Phân tích và chuẩn hóa thông tin video YouTube
 * @param {string} url
 * @returns {{ isValid: boolean, videoId?: string, embedUrl?: string, provider?: string, error?: string }}
 */
const parseYouTubeVideo = (url) => {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return {
      isValid: false,
      error:
        "Đường dẫn YouTube không hợp lệ. Vui lòng sử dụng liên kết chuẩn dạng youtube.com/watch?v=... hoặc youtu.be/...",
    };
  }

  return {
    isValid: true,
    videoId,
    embedUrl: formatYouTubeEmbedUrl(videoId),
    provider: "youtube",
  };
};

module.exports = {
  ALLOWED_YOUTUBE_HOSTNAMES,
  YOUTUBE_VIDEO_ID_REGEX,
  extractYouTubeVideoId,
  isValidYouTubeUrl,
  formatYouTubeEmbedUrl,
  parseYouTubeVideo,
};
