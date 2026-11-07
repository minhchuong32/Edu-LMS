const {
  extractYouTubeVideoId,
  isValidYouTubeUrl,
  formatYouTubeEmbedUrl,
  parseYouTubeVideo,
} = require("../src/utils/youtubeHelper");

describe("YouTube Helper Utility Unit Tests", () => {
  const VALID_VIDEO_ID = "dQw4w9WgXcQ";

  describe("1. Trích xuất YouTube Video ID từ các định dạng URL hợp lệ", () => {
    it("trích xuất từ định dạng chuẩn https://www.youtube.com/watch?v=VIDEO_ID", () => {
      const url = `https://www.youtube.com/watch?v=${VALID_VIDEO_ID}`;
      expect(extractYouTubeVideoId(url)).toBe(VALID_VIDEO_ID);
    });

    it("trích xuất từ URL có kèm query parameters khác (&t=42s, &feature=shared)", () => {
      const url = `https://www.youtube.com/watch?v=${VALID_VIDEO_ID}&t=42s&feature=shared`;
      expect(extractYouTubeVideoId(url)).toBe(VALID_VIDEO_ID);
    });

    it("trích xuất từ định dạng rút gọn https://youtu.be/VIDEO_ID", () => {
      const url = `https://youtu.be/${VALID_VIDEO_ID}`;
      expect(extractYouTubeVideoId(url)).toBe(VALID_VIDEO_ID);
    });

    it("trích xuất từ định dạng rút gọn có tham số thời gian https://youtu.be/VIDEO_ID?t=15", () => {
      const url = `https://youtu.be/${VALID_VIDEO_ID}?t=15`;
      expect(extractYouTubeVideoId(url)).toBe(VALID_VIDEO_ID);
    });

    it("trích xuất từ định dạng embed https://www.youtube.com/embed/VIDEO_ID", () => {
      const url = `https://www.youtube.com/embed/${VALID_VIDEO_ID}`;
      expect(extractYouTubeVideoId(url)).toBe(VALID_VIDEO_ID);
    });

    it("trích xuất từ định dạng Shorts https://www.youtube.com/shorts/VIDEO_ID", () => {
      const url = `https://www.youtube.com/shorts/${VALID_VIDEO_ID}`;
      expect(extractYouTubeVideoId(url)).toBe(VALID_VIDEO_ID);
    });

    it("trích xuất từ giao diện mobile https://m.youtube.com/watch?v=VIDEO_ID", () => {
      const url = `https://m.youtube.com/watch?v=${VALID_VIDEO_ID}`;
      expect(extractYouTubeVideoId(url)).toBe(VALID_VIDEO_ID);
    });

    it("chấp nhận khi người dùng nhập trực tiếp Video ID (11 ký tự)", () => {
      expect(extractYouTubeVideoId(VALID_VIDEO_ID)).toBe(VALID_VIDEO_ID);
    });
  });

  describe("2. Từ chối URL không hợp lệ, domain lạ và ngăn chặn mã độc (XSS / Injection)", () => {
    it("trả về null nếu URL rỗng, null hoặc undefined", () => {
      expect(extractYouTubeVideoId("")).toBeNull();
      expect(extractYouTubeVideoId(null)).toBeNull();
      expect(extractYouTubeVideoId(undefined)).toBeNull();
    });

    it("từ chối URL thuộc domain khác (Vimeo, Dailymotion, Google, Facebook)", () => {
      expect(extractYouTubeVideoId("https://vimeo.com/123456789")).toBeNull();
      expect(extractYouTubeVideoId("https://google.com/search?q=youtube")).toBeNull();
      expect(extractYouTubeVideoId("https://facebook.com/watch/?v=12345678901")).toBeNull();
    });

    it("từ chối domain giả mạo (fakeyoutube.com, malicious-youtube.org)", () => {
      expect(
        extractYouTubeVideoId(`https://fakeyoutube.com/watch?v=${VALID_VIDEO_ID}`)
      ).toBeNull();
      expect(
        extractYouTubeVideoId(`https://not-youtube.com/embed/${VALID_VIDEO_ID}`)
      ).toBeNull();
    });

    it("chặn mã HTML, iframe injection và script injection", () => {
      expect(
        extractYouTubeVideoId(
          `<iframe src="https://www.youtube.com/embed/${VALID_VIDEO_ID}"></iframe>`
        )
      ).toBeNull();
      expect(
        extractYouTubeVideoId("javascript:alert('XSS-Attack')")
      ).toBeNull();
      expect(
        extractYouTubeVideoId(`<script>window.location='evil.com'</script>`)
      ).toBeNull();
    });

    it("từ chối Video ID sai định dạng (quá ngắn < 3 ký tự hoặc chứa ký tự đặc biệt)", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=1")).toBeNull();
      expect(
        extractYouTubeVideoId("https://www.youtube.com/watch?v=video$id*bad!")
      ).toBeNull();
    });
  });

  describe("3. Kiểm tra isValidYouTubeUrl", () => {
    it("trả về true đối với các liên kết YouTube hợp lệ", () => {
      expect(isValidYouTubeUrl(`https://www.youtube.com/watch?v=${VALID_VIDEO_ID}`)).toBe(true);
      expect(isValidYouTubeUrl(`https://youtu.be/${VALID_VIDEO_ID}`)).toBe(true);
    });

    it("trả về false đối với liên kết sai", () => {
      expect(isValidYouTubeUrl("https://example.com")).toBe(false);
      expect(isValidYouTubeUrl("invalid-string")).toBe(false);
    });
  });

  describe("4. formatYouTubeEmbedUrl & parseYouTubeVideo", () => {
    it("sinh URL embed chuẩn hóa không autoplay và rel=0", () => {
      const embedUrl = formatYouTubeEmbedUrl(VALID_VIDEO_ID);
      expect(embedUrl).toContain(`https://www.youtube.com/embed/${VALID_VIDEO_ID}`);
      expect(embedUrl).toContain("autoplay=0");
      expect(embedUrl).toContain("rel=0");
    });

    it("ném lỗi nếu videoId truyền vào không hợp lệ", () => {
      expect(() => formatYouTubeEmbedUrl("invalid!")).toThrow();
      expect(() => formatYouTubeEmbedUrl("")).toThrow();
    });

    it("parseYouTubeVideo trả về đầy đủ thông tin chuẩn hóa", () => {
      const result = parseYouTubeVideo(`https://www.youtube.com/watch?v=${VALID_VIDEO_ID}`);
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe(VALID_VIDEO_ID);
      expect(result.provider).toBe("youtube");
      expect(result.embedUrl).toContain(VALID_VIDEO_ID);
    });

    it("parseYouTubeVideo trả về thông báo lỗi thân thiện khi URL sai", () => {
      const result = parseYouTubeVideo("https://invalid-video-link.com");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
