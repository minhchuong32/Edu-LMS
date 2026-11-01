const {
  prepareGradebookExportData,
  parseStudentImportData,
} = require("../src/services/excel.service");

describe("Excel Service Tests", () => {
  it("prepareGradebookExportData chuẩn hóa dữ liệu bảng điểm xuất báo cáo", () => {
    const rawGrades = [
      {
        studentCode: "HS001",
        fullName: "Học Sinh A",
        coeff1: [8, 9],
        coeff2: [7.5],
        coeff3: 8,
        gpa: 8.1,
        conduct: "Tốt",
      },
    ];

    const data = prepareGradebookExportData("10A1", rawGrades);
    expect(data.sheetName).toBe("Bảng điểm lớp 10A1");
    expect(data.totalStudents).toBe(1);
    expect(data.rows[0].stt).toBe(1);
    expect(data.rows[0].coeff1).toBe("8, 9");
    expect(data.rows[0].gpa).toBe(8.1);
  });

  it("parseStudentImportData chuyển đổi dữ liệu thô từ file Excel", () => {
    const rawRows = [
      {
        "Mã Học Sinh": "HS123",
        "Họ và Tên": "Trần Thị B",
        "Giới tính": "Nữ",
        "Ngày sinh": "2008-01-01",
        "Số điện thoại PH": "0912345678",
      },
    ];

    const parsed = parseStudentImportData(rawRows);
    expect(parsed[0].studentCode).toBe("HS123");
    expect(parsed[0].fullName).toBe("Trần Thị B");
    expect(parsed[0].gender).toBe("Nữ");
    expect(parsed[0].parentPhone).toBe("0912345678");
  });
});
