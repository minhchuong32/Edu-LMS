const {
  calculateSubjectGPA,
  calculateOverallGPA,
  classifyAcademicPerformance,
} = require("../src/services/gradebook.service");

describe("Gradebook Service Tests", () => {
  describe("calculateSubjectGPA", () => {
    it("tính chính xác điểm TBM theo hệ số 1, 2, 3", () => {
      // HS1: 8, 9 (count = 2) -> sum = 17 * 1 = 17
      // HS2: 7 (count = 1) -> sum = 7 * 2 = 14
      // HS3: 8 (count = 1) -> sum = 8 * 3 = 24
      // Total score = 17 + 14 + 24 = 55
      // Total coeff = 2*1 + 1*2 + 1*3 = 7
      // 55 / 7 = 7.857... -> 7.9
      const gpa = calculateSubjectGPA([8, 9], [7], [8]);
      expect(gpa).toBe(7.9);
    });

    it("bỏ qua các giá trị không hợp lệ (null, undefined, NaN, string)", () => {
      const gpa = calculateSubjectGPA([8, null, "abc"], [7, undefined], [8]);
      expect(gpa).toBe(7.7); // (8*1 + 7*2 + 8*3) / (1 + 2 + 3) = 46 / 6 = 7.666 -> 7.7
    });

    it("trả về null nếu không có điểm hợp lệ nào", () => {
      expect(calculateSubjectGPA([], [], [])).toBeNull();
      expect(calculateSubjectGPA([null], [undefined], [NaN])).toBeNull();
    });
  });

  describe("calculateOverallGPA", () => {
    it("tính điểm trung bình tích lũy có trọng số", () => {
      const subjects = [
        { subjectName: "Toán", gpa: 8.5, weight: 2 },
        { subjectName: "Văn", gpa: 7.5, weight: 2 },
        { subjectName: "Anh", gpa: 9.0, weight: 1 },
      ];
      // (8.5*2 + 7.5*2 + 9.0*1) / 5 = (17 + 15 + 9) / 5 = 41 / 5 = 8.2
      expect(calculateOverallGPA(subjects)).toBe(8.2);
    });

    it("mặc định trọng số weight là 1 nếu không truyền", () => {
      const subjects = [
        { subjectName: "Toán", gpa: 8.0 },
        { subjectName: "Lý", gpa: 9.0 },
      ];
      expect(calculateOverallGPA(subjects)).toBe(8.5);
    });

    it("trả về null khi danh sách môn rỗng hoặc không có điểm", () => {
      expect(calculateOverallGPA([])).toBeNull();
      expect(calculateOverallGPA([{ subjectName: "Hóa", gpa: null }])).toBeNull();
    });
  });

  describe("classifyAcademicPerformance", () => {
    it("phân loại đúng học lực chuẩn THPT", () => {
      expect(classifyAcademicPerformance(9.5)).toBe("Xuất sắc");
      expect(classifyAcademicPerformance(9.0)).toBe("Xuất sắc");
      expect(classifyAcademicPerformance(8.5)).toBe("Giỏi");
      expect(classifyAcademicPerformance(8.0)).toBe("Giỏi");
      expect(classifyAcademicPerformance(7.0)).toBe("Khá");
      expect(classifyAcademicPerformance(6.5)).toBe("Khá");
      expect(classifyAcademicPerformance(5.5)).toBe("Trung bình");
      expect(classifyAcademicPerformance(5.0)).toBe("Trung bình");
      expect(classifyAcademicPerformance(4.0)).toBe("Yếu");
      expect(classifyAcademicPerformance(3.5)).toBe("Yếu");
      expect(classifyAcademicPerformance(3.0)).toBe("Kém");
      expect(classifyAcademicPerformance(1.0)).toBe("Kém");
      expect(classifyAcademicPerformance(null)).toBe("Chưa xếp loại");
      expect(classifyAcademicPerformance(NaN)).toBe("Chưa xếp loại");
    });
  });
});
