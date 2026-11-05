const mongoose = require("mongoose");
const LessonContent = require("../src/models/LessonContent");

describe("LessonContent Model Unit Tests (Schema Validation)", () => {
  const dummyAssignmentId = new mongoose.Types.ObjectId();

  it("cho phép khởi tạo document hợp lệ đầy đủ các trường", async () => {
    const validLesson = new LessonContent({
      title: "Bài 1: Khái niệm cơ bản về Hệ quản trị CSDL",
      description: "Giới thiệu tổng quan về CSDL quan hệ",
      contentType: "video",
      resourceUrl: "https://youtube.com/watch?v=sample-video-id",
      order: 1,
      teachingAssignment: dummyAssignmentId,
    });

    await expect(validLesson.validate()).resolves.toBeUndefined();
    expect(validLesson.title).toBe(
      "Bài 1: Khái niệm cơ bản về Hệ quản trị CSDL"
    );
    expect(validLesson.contentType).toBe("video");
    expect(validLesson.order).toBe(1);
    expect(validLesson.isActive).toBe(true);
    expect(validLesson.isDeleted).toBe(false);
  });

  it("bắt buộc phải có title", async () => {
    const lesson = new LessonContent({
      contentType: "video",
      resourceUrl: "https://example.com/video.mp4",
      teachingAssignment: dummyAssignmentId,
    });

    await expect(lesson.validate()).rejects.toThrow(
      "Tiêu đề bài giảng là bắt buộc"
    );
  });

  it("chặn title có độ dài dưới 2 ký tự", async () => {
    const lesson = new LessonContent({
      title: "A",
      contentType: "text",
      teachingAssignment: dummyAssignmentId,
    });

    await expect(lesson.validate()).rejects.toThrow(
      "Tiêu đề bài giảng phải có ít nhất 2 ký tự"
    );
  });

  it("bắt buộc phải có teachingAssignment", async () => {
    const lesson = new LessonContent({
      title: "Bài 2: Kiến trúc hệ CSDL",
      contentType: "pdf",
      resourceUrl: "https://example.com/slide.pdf",
    });

    await expect(lesson.validate()).rejects.toThrow(
      "Phân công giảng dạy là bắt buộc"
    );
  });

  it("chặn contentType không nằm trong enum", async () => {
    const lesson = new LessonContent({
      title: "Bài giảng thử nghiệm",
      contentType: "unsupported_type",
      teachingAssignment: dummyAssignmentId,
    });

    await expect(lesson.validate()).rejects.toThrow(
      "Loại nội dung 'unsupported_type' không hợp lệ"
    );
  });

  it("chấp nhận các contentType hợp lệ: video, pdf, slide, document, link, text", async () => {
    const validTypes = ["video", "pdf", "slide", "document", "link", "text"];
    for (const type of validTypes) {
      const lesson = new LessonContent({
        title: `Bài học loại ${type}`,
        contentType: type,
        resourceUrl: type === "text" ? "" : "https://example.com/resource",
        teachingAssignment: dummyAssignmentId,
      });

      await expect(lesson.validate()).resolves.toBeUndefined();
    }
  });

  it("chấp nhận contentType là 'text' mà không bắt buộc resourceUrl", async () => {
    const lesson = new LessonContent({
      title: "Thông báo hướng dẫn nộp bài tập",
      description: "Các em học sinh nộp bài trước 23h59 Chủ Nhật",
      contentType: "text",
      resourceUrl: "",
      teachingAssignment: dummyAssignmentId,
    });

    await expect(lesson.validate()).resolves.toBeUndefined();
  });

  it("bắt lỗi khi contentType là video nhưng resourceUrl để trống", async () => {
    const lesson = new LessonContent({
      title: "Video bài giảng số 1",
      contentType: "video",
      resourceUrl: "",
      teachingAssignment: dummyAssignmentId,
    });

    await expect(lesson.validate()).rejects.toThrow(
      "Đường dẫn tài liệu/video (resourceUrl) không hợp lệ"
    );
  });

  it("thứ tự order không được nhỏ hơn 1", async () => {
    const lesson = new LessonContent({
      title: "Bài 3",
      contentType: "text",
      order: 0,
      teachingAssignment: dummyAssignmentId,
    });

    await expect(lesson.validate()).rejects.toThrow(
      "Thứ tự hiển thị phải lớn hơn hoặc bằng 1"
    );
  });

  it("tự động trim khoảng trắng thừa ở các trường chuỗi", () => {
    const lesson = new LessonContent({
      title: "   Bài học số 5   ",
      contentType: "  text  ",
      description: "   Nội dung mô tả   ",
      teachingAssignment: dummyAssignmentId,
    });

    expect(lesson.title).toBe("Bài học số 5");
    expect(lesson.contentType).toBe("text");
    expect(lesson.description).toBe("Nội dung mô tả");
  });

  it("kiểm tra cấu hình index chính xác", () => {
    const indexes = LessonContent.schema.indexes();
    const hasOrderIndex = indexes.some(
      ([idx]) =>
        idx.teachingAssignment === 1 && idx.order === 1 && idx.isDeleted === 1
    );
    const hasContentTypeIndex = indexes.some(
      ([idx]) =>
        idx.teachingAssignment === 1 &&
        idx.contentType === 1 &&
        idx.isDeleted === 1
    );

    expect(hasOrderIndex).toBe(true);
    expect(hasContentTypeIndex).toBe(true);
  });
});
