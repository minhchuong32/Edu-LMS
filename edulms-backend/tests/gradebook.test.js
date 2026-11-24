const mongoose = require("mongoose");
const GradeRecord = require("../src/models/GradeRecord");
const TeachingAssignment = require("../src/models/TeachingAssignment");
const User = require("../src/models/User");
const {
  calculateSubjectGPA,
  calculateOverallGPA,
  classifyAcademicPerformance,
  calculateWeightedAverage,
  getGradeWeightConfig,
  setGradeWeightConfig,
  resetGradeWeightConfig,
  validateGradeValue,
} = require("../src/services/gradebook.service");
const {
  canManageGradeRecord,
  canViewGradeRecords,
} = require("../src/middlewares/gradeRecordPermission.middleware");
const {
  createGradeRecord,
  updateGradeRecord,
  deleteGradeRecord,
  getGradeRecords,
  getGradeWeightConfig: getWeightsCtrl,
  updateGradeWeightConfig: updateWeightsCtrl,
} = require("../src/controllers/gradebook.controller");

// Helper tạo mock Mongoose query chain có thể await
const createMockQuery = (resolvedValue) => {
  const query = {
    sort: jest.fn(),
    populate: jest.fn(),
    select: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(),
  };
  query.sort.mockReturnValue(query);
  query.populate.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.lean.mockResolvedValue(resolvedValue);
  query.then = (resolve, reject) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  return query;
};

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

/* ============================================================================
   1. KIỂM THỬ SCHEMA MODEL GRADERECORD
============================================================================ */
describe("GradeRecord Model Schema Validation Tests", () => {
  const dummyStudentId = new mongoose.Types.ObjectId();
  const dummyTaId = new mongoose.Types.ObjectId();

  it("khởi tạo hợp lệ với đầy đủ các trường và tự động gán weight từ cấu hình theo gradeType", async () => {
    const doc = new GradeRecord({
      student: dummyStudentId,
      teachingAssignment: dummyTaId,
      semester: "HK1",
      gradeType: "midterm",
      value: 8.5,
    });

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.student).toEqual(dummyStudentId);
    expect(doc.teachingAssignment).toEqual(dummyTaId);
    expect(doc.semester).toBe("HK1");
    expect(doc.gradeType).toBe("midterm");
    expect(doc.value).toBe(8.5);
    expect(doc.weight).toBe(2); // Tự động lấy hệ số 2 cho 'midterm'
    expect(doc.isDeleted).toBe(false);
  });

  it("bắt buộc phải có student, teachingAssignment, gradeType và value", async () => {
    const emptyDoc = new GradeRecord({});
    let err;
    try {
      await emptyDoc.validate();
    } catch (e) {
      err = e;
    }

    expect(err).toBeDefined();
    expect(err.errors.student).toBeDefined();
    expect(err.errors.teachingAssignment).toBeDefined();
    expect(err.errors.gradeType).toBeDefined();
    expect(err.errors.value).toBeDefined();
  });

  it("chặn điểm số (value) nằm ngoài khoảng 0 - 10", async () => {
    const negativeDoc = new GradeRecord({
      student: dummyStudentId,
      teachingAssignment: dummyTaId,
      semester: "HK1",
      gradeType: "oral",
      value: -0.5,
      weight: 1,
    });

    await expect(negativeDoc.validate()).rejects.toThrow(
      /Điểm số phải nằm trong khoảng từ 0 đến 10/i
    );

    const overTenDoc = new GradeRecord({
      student: dummyStudentId,
      teachingAssignment: dummyTaId,
      semester: "HK1",
      gradeType: "final",
      value: 10.25,
      weight: 3,
    });

    await expect(overTenDoc.validate()).rejects.toThrow(
      /Điểm số phải nằm trong khoảng từ 0 đến 10/i
    );
  });

  it("chặn gradeType hoặc semester không hợp lệ", async () => {
    const invalidTypeDoc = new GradeRecord({
      student: dummyStudentId,
      teachingAssignment: dummyTaId,
      semester: "HK1",
      gradeType: "unknown_type",
      value: 8,
      weight: 1,
    });

    await expect(invalidTypeDoc.validate()).rejects.toThrow(
      /Loại điểm 'unknown_type' không hợp lệ/i
    );

    const invalidSemDoc = new GradeRecord({
      student: dummyStudentId,
      teachingAssignment: dummyTaId,
      semester: "HK3",
      gradeType: "oral",
      value: 8,
      weight: 1,
    });

    await expect(invalidSemDoc.validate()).rejects.toThrow(
      /Học kỳ 'HK3' không hợp lệ/i
    );
  });
});

/* ============================================================================
   2. KIỂM THỬ LOGIC TÍNH ĐIỂM TRUNG BÌNH CÓ CẤU HÌNH HỆ SỐ
============================================================================ */
describe("Gradebook Service & Configurable Weighted Average Tests", () => {
  beforeEach(() => {
    resetGradeWeightConfig();
  });

  describe("calculateWeightedAverage & Cấu hình hệ số động (Configurable Weights)", () => {
    it("tính điểm trung bình từ danh sách GradeRecord theo hệ số mặc định (1, 2, 3)", () => {
      const records = [
        { gradeType: "oral", value: 8, weight: 1 },
        { gradeType: "15min", value: 9, weight: 1 },
        { gradeType: "midterm", value: 7, weight: 2 },
        { gradeType: "final", value: 8, weight: 3 },
      ];
      // (8*1 + 9*1 + 7*2 + 8*3) / (1 + 1 + 2 + 3) = 55 / 7 = 7.857 -> 7.9
      expect(calculateWeightedAverage(records)).toBe(7.9);
    });

    it("cho phép thay đổi hệ số cấu hình (thay vì hard-code) để tính lại điểm trung bình", () => {
      const records = [
        { gradeType: "regular", value: 6 },
        { gradeType: "midterm", value: 8 },
        { gradeType: "final", value: 10 },
      ];

      // Với hệ số mặc định (regular=1, midterm=2, final=3): (6*1 + 8*2 + 10*3) / 6 = 52 / 6 = 8.7
      expect(calculateWeightedAverage(records)).toBe(8.7);

      // Cấu hình hệ số mới qua tham số customWeightConfig (regular=1, midterm=3, final=6)
      // (6*1 + 8*3 + 10*6) / (1 + 3 + 6) = 90 / 10 = 9.0
      expect(
        calculateWeightedAverage(records, {
          regular: 1,
          midterm: 3,
          final: 6,
        })
      ).toBe(9.0);

      // Cập nhật hệ số toàn cục bằng setGradeWeightConfig
      setGradeWeightConfig({ regular: 2, midterm: 2, final: 4 });
      expect(getGradeWeightConfig().regular).toBe(2);
      expect(getGradeWeightConfig().final).toBe(4);
      // (6*2 + 8*2 + 10*4) / (2 + 2 + 4) = 68 / 8 = 8.5
      expect(calculateWeightedAverage(records)).toBe(8.5);
    });

    it("bỏ qua các bản ghi có điểm không hợp lệ và trả về null nếu danh sách rỗng", () => {
      expect(calculateWeightedAverage([])).toBeNull();
      expect(
        calculateWeightedAverage([
          { gradeType: "oral", value: null, weight: 1 },
          { gradeType: "midterm", value: "abc", weight: 2 },
          { gradeType: "final", value: 12, weight: 3 },
        ])
      ).toBeNull();
    });

    it("validateGradeValue kiểm tra chặt chẽ điểm trong khoảng 0 - 10", () => {
      expect(validateGradeValue(0)).toBe(0);
      expect(validateGradeValue(10)).toBe(10);
      expect(validateGradeValue("8.756")).toBe(8.76);
      expect(() => validateGradeValue(-0.1)).toThrow(
        /Điểm số \(value\) phải nằm trong khoảng từ 0 đến 10/i
      );
      expect(() => validateGradeValue(10.01)).toThrow(
        /Điểm số \(value\) phải nằm trong khoảng từ 0 đến 10/i
      );
      expect(() => validateGradeValue("")).toThrow(
        /Giá trị điểm \(value\) là bắt buộc/i
      );
      expect(() => validateGradeValue(true)).toThrow(
        /Giá trị điểm \(value\) là bắt buộc/i
      );
    });
  });

  describe("calculateSubjectGPA", () => {
    it("tính chính xác điểm TBM theo hệ số 1, 2, 3", () => {
      const gpa = calculateSubjectGPA([8, 9], [7], [8]);
      expect(gpa).toBe(7.9);
    });

    it("hỗ trợ truyền cấu hình hệ số tùy chỉnh vào calculateSubjectGPA", () => {
      // hệ số 1, 3, 6: ((8+9)*1 + 7*3 + 8*6) / (2*1 + 1*3 + 1*6) = (17 + 21 + 48) / 11 = 86 / 11 = 7.818 -> 7.8
      const gpa = calculateSubjectGPA([8, 9], [7], [8], {
        coeff1: 1,
        coeff2: 3,
        coeff3: 6,
      });
      expect(gpa).toBe(7.8);
    });

    it("bỏ qua các giá trị không hợp lệ (null, undefined, NaN, string)", () => {
      const gpa = calculateSubjectGPA([8, null, "abc"], [7, undefined], [8]);
      expect(gpa).toBe(7.7);
    });

    it("trả về null nếu không có điểm hợp lệ nào", () => {
      expect(calculateSubjectGPA([], [], [])).toBeNull();
      expect(calculateSubjectGPA([null], [undefined], [NaN])).toBeNull();
    });
  });

  describe("calculateOverallGPA & classifyAcademicPerformance", () => {
    it("tính điểm trung bình tích lũy có trọng số", () => {
      const subjects = [
        { subjectName: "Toán", gpa: 8.5, weight: 2 },
        { subjectName: "Văn", gpa: 7.5, weight: 2 },
        { subjectName: "Anh", gpa: 9.0, weight: 1 },
      ];
      expect(calculateOverallGPA(subjects)).toBe(8.2);
    });

    it("mặc định trọng số weight là 1 nếu không truyền và trả về null khi rỗng", () => {
      expect(
        calculateOverallGPA([
          { subjectName: "Toán", gpa: 8.0 },
          { subjectName: "Lý", gpa: 9.0 },
        ])
      ).toBe(8.5);
      expect(calculateOverallGPA([])).toBeNull();
      expect(
        calculateOverallGPA([{ subjectName: "Hóa", gpa: null }])
      ).toBeNull();
    });

    it("phân loại đúng học lực chuẩn THPT", () => {
      expect(classifyAcademicPerformance(9.5)).toBe("Xuất sắc");
      expect(classifyAcademicPerformance(8.5)).toBe("Giỏi");
      expect(classifyAcademicPerformance(7.0)).toBe("Khá");
      expect(classifyAcademicPerformance(5.5)).toBe("Trung bình");
      expect(classifyAcademicPerformance(4.0)).toBe("Yếu");
      expect(classifyAcademicPerformance(3.0)).toBe("Kém");
      expect(classifyAcademicPerformance(null)).toBe("Chưa xếp loại");
    });
  });
});

/* ============================================================================
   3. KIỂM THỬ PHÂN QUYỀN GIÁO VIÊN THEO TEACHINGASSIGNMENT & API CRUD ĐIỂM
============================================================================ */
describe("GradeRecord Permission Middleware & Controller API Tests", () => {
  const teacherOwnerId = new mongoose.Types.ObjectId();
  const otherTeacherId = new mongoose.Types.ObjectId();
  const student1Id = new mongoose.Types.ObjectId();
  const student2Id = new mongoose.Types.ObjectId();
  const class10A1Id = new mongoose.Types.ObjectId();
  const subjectMathId = new mongoose.Types.ObjectId();
  const taId = new mongoose.Types.ObjectId();
  const recordId = new mongoose.Types.ObjectId();

  const mockTeachingAssignment = {
    _id: taId,
    class: class10A1Id,
    subject: subjectMathId,
    teacher: teacherOwnerId,
    academicYear: "2025-2026",
    semester: "CaNam",
    isDeleted: false,
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    resetGradeWeightConfig();
  });

  it("canManageGradeRecord: cho phép giáo viên phụ trách TeachingAssignment nhập điểm và chặn (403) giáo viên không phụ trách hoặc học sinh", async () => {
    jest
      .spyOn(TeachingAssignment, "findOne")
      .mockResolvedValue(mockTeachingAssignment);

    // 1. Học sinh bị chặn 403
    const reqStudent = {
      user: { userId: student1Id.toString(), role: "student" },
      body: { teachingAssignment: taId.toString() },
    };
    const resStudent = createMockRes();
    const nextStudent = jest.fn();
    await canManageGradeRecord(reqStudent, resStudent, nextStudent);
    expect(resStudent.status).toHaveBeenCalledWith(403);
    expect(nextStudent).not.toHaveBeenCalled();

    // 2. Giáo viên khác lớp bị chặn 403
    const reqOtherTeacher = {
      user: { userId: otherTeacherId.toString(), role: "teacher" },
      body: { teachingAssignment: taId.toString() },
    };
    const resOtherTeacher = createMockRes();
    const nextOtherTeacher = jest.fn();
    await canManageGradeRecord(
      reqOtherTeacher,
      resOtherTeacher,
      nextOtherTeacher
    );
    expect(resOtherTeacher.status).toHaveBeenCalledWith(403);
    expect(nextOtherTeacher).not.toHaveBeenCalled();

    // 3. Giáo viên phụ trách chính được phép (next() được gọi)
    const reqOwner = {
      user: { userId: teacherOwnerId.toString(), role: "teacher" },
      body: { teachingAssignment: taId.toString() },
    };
    const resOwner = createMockRes();
    const nextOwner = jest.fn();
    await canManageGradeRecord(reqOwner, resOwner, nextOwner);
    expect(nextOwner).toHaveBeenCalledTimes(1);
    expect(reqOwner.targetTeachingAssignment).toEqual(mockTeachingAssignment);
  });

  it("createGradeRecord API: nhập điểm hợp lệ (201), tự động gắn weight theo cấu hình và từ chối điểm ngoài khoảng 0-10 (400)", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue({
      _id: student1Id,
      role: "student",
      classRef: class10A1Id,
      className: "10A1",
    });

    jest
      .spyOn(GradeRecord.prototype, "save")
      .mockImplementation(async function () {
        return this;
      });

    // 1. Nhập điểm hợp lệ (value = 9.25, gradeType = 'final' -> tự động weight = 3)
    const reqValid = {
      user: { userId: teacherOwnerId.toString(), role: "teacher" },
      targetTeachingAssignment: mockTeachingAssignment,
      body: {
        student: student1Id.toString(),
        teachingAssignment: taId.toString(),
        semester: "HK1",
        gradeType: "final",
        value: 9.25,
        note: "Bài thi cuối học kỳ 1",
      },
    };
    const resValid = createMockRes();
    const nextValid = jest.fn();

    await createGradeRecord(reqValid, resValid, nextValid);
    expect(resValid.status).toHaveBeenCalledWith(201);
    const responsePayload = resValid.json.mock.calls[0][0];
    expect(responsePayload.success).toBe(true);
    expect(responsePayload.data.value).toBe(9.25);
    expect(responsePayload.data.weight).toBe(3);
    expect(responsePayload.data.semester).toBe("HK1");

    // 2. Nhập điểm vượt quá 10 (value = 11.5 -> 400 Bad Request)
    const reqInvalidScore = {
      user: { userId: teacherOwnerId.toString(), role: "teacher" },
      targetTeachingAssignment: mockTeachingAssignment,
      body: {
        student: student1Id.toString(),
        teachingAssignment: taId.toString(),
        semester: "HK1",
        gradeType: "oral",
        value: 11.5,
      },
    };
    const resInvalidScore = createMockRes();
    await createGradeRecord(reqInvalidScore, resInvalidScore, jest.fn());
    expect(resInvalidScore.status).toHaveBeenCalledWith(400);
    expect(resInvalidScore.json.mock.calls[0][0].message).toMatch(
      /Điểm số \(value\) phải nằm trong khoảng từ 0 đến 10/i
    );
  });

  it("updateGradeRecord & deleteGradeRecord API: cho phép giáo viên phụ trách sửa và xóa mềm điểm, cập nhật lại weight khi đổi gradeType", async () => {
    const existingDoc = new GradeRecord({
      _id: recordId,
      student: student1Id,
      teachingAssignment: taId,
      semester: "HK1",
      gradeType: "oral",
      value: 7.0,
      weight: 1,
    });
    existingDoc.save = jest.fn().mockResolvedValue(existingDoc);

    // Sửa điểm từ 7.0 (oral - hệ số 1) sang 8.5 (midterm - hệ số 2)
    const reqUpdate = {
      params: { id: recordId.toString() },
      user: { userId: teacherOwnerId.toString(), role: "teacher" },
      targetGradeRecord: existingDoc,
      targetTeachingAssignment: mockTeachingAssignment,
      body: {
        value: 8.5,
        gradeType: "midterm",
      },
    };
    const resUpdate = createMockRes();
    await updateGradeRecord(reqUpdate, resUpdate, jest.fn());

    expect(resUpdate.status).toHaveBeenCalledWith(200);
    expect(existingDoc.value).toBe(8.5);
    expect(existingDoc.gradeType).toBe("midterm");
    expect(existingDoc.weight).toBe(2);

    // Xóa mềm bản ghi điểm
    const reqDelete = {
      params: { id: recordId.toString() },
      user: { userId: teacherOwnerId.toString(), role: "teacher" },
      targetGradeRecord: existingDoc,
      targetTeachingAssignment: mockTeachingAssignment,
    };
    const resDelete = createMockRes();
    await deleteGradeRecord(reqDelete, resDelete, jest.fn());
    expect(resDelete.status).toHaveBeenCalledWith(200);
    expect(existingDoc.isDeleted).toBe(true);
  });

  it("getGradeRecords API: truy vấn điểm theo học sinh/lớp/môn/học kỳ, tự động tính điểm trung bình theo hệ số và giới hạn học sinh chỉ xem điểm của mình", async () => {
    const mockRecords = [
      {
        _id: new mongoose.Types.ObjectId(),
        student: { _id: student1Id, fullName: "Nguyễn Văn An", userCode: "HS001" },
        teachingAssignment: mockTeachingAssignment,
        semester: "HK1",
        gradeType: "oral",
        value: 8,
        weight: 1,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        student: { _id: student1Id, fullName: "Nguyễn Văn An", userCode: "HS001" },
        teachingAssignment: mockTeachingAssignment,
        semester: "HK1",
        gradeType: "midterm",
        value: 7,
        weight: 2,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        student: { _id: student1Id, fullName: "Nguyễn Văn An", userCode: "HS001" },
        teachingAssignment: mockTeachingAssignment,
        semester: "HK1",
        gradeType: "final",
        value: 9,
        weight: 3,
      },
    ];

    jest
      .spyOn(GradeRecord, "find")
      .mockReturnValue(createMockQuery(mockRecords));

    // 1. Giáo viên truy vấn bảng điểm của học sinh theo teachingAssignment & semester
    const reqGet = {
      user: { userId: teacherOwnerId.toString(), role: "teacher" },
      targetTeachingAssignment: mockTeachingAssignment,
      query: {
        teachingAssignment: taId.toString(),
        student: student1Id.toString(),
        semester: "HK1",
      },
      params: {},
    };
    const resGet = createMockRes();
    await getGradeRecords(reqGet, resGet, jest.fn());

    expect(resGet.status).toHaveBeenCalledWith(200);
    const body = resGet.json.mock.calls[0][0];
    expect(body.data.records).toHaveLength(3);
    // (8*1 + 7*2 + 9*3) / (1 + 2 + 3) = 49 / 6 = 8.166... -> 8.2
    expect(body.data.average).toBe(8.2);
    expect(body.data.academicPerformance).toBe("Giỏi");
    expect(body.data.summaries[0].average).toBe(8.2);

    // 2. Học sinh cố tình xem điểm của bạn khác (student2Id) -> bị chặn 403
    const reqOtherStudent = {
      user: { userId: student1Id.toString(), role: "student" },
      query: { student: student2Id.toString() },
      params: {},
    };
    const resOtherStudent = createMockRes();
    await canViewGradeRecords(reqOtherStudent, resOtherStudent, jest.fn());
    expect(resOtherStudent.status).toHaveBeenCalledWith(403);
  });

  it("getGradeWeightConfig & updateGradeWeightConfig API: cho phép xem và cấu hình hệ số điểm động", async () => {
    const reqUpdate = {
      user: { userId: teacherOwnerId.toString(), role: "admin" },
      body: { oral: 1, midterm: 2.5, final: 3.5 },
    };
    const resUpdate = createMockRes();
    updateWeightsCtrl(reqUpdate, resUpdate, jest.fn());
    expect(resUpdate.status).toHaveBeenCalledWith(200);
    expect(resUpdate.json.mock.calls[0][0].data.midterm).toBe(2.5);
    expect(resUpdate.json.mock.calls[0][0].data.final).toBe(3.5);

    const resGet = createMockRes();
    getWeightsCtrl({}, resGet);
    expect(resGet.status).toHaveBeenCalledWith(200);
    expect(resGet.json.mock.calls[0][0].data.midterm).toBe(2.5);
  });
});
