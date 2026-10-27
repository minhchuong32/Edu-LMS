const { authorize } = require("../src/middlewares/rbac.middleware");

describe("RBAC Middleware Unit Tests (EL-26)", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it("trả về 401 nếu req.user chưa được xác thực", () => {
    const middleware = authorize("admin");
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/Chưa xác thực/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("trả về 403 nếu người dùng có vai trò không nằm trong danh sách cho phép", () => {
    req.user = { userId: "u123", role: "student" };
    const middleware = authorize("admin", "teacher");
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringMatching(/không có quyền truy cập/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("cho phép truy cập (gọi next) đối với vai trò admin", () => {
    req.user = { userId: "adm1", role: "admin" };
    const middleware = authorize("admin");
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("cho phép truy cập (gọi next) đối với vai trò teacher", () => {
    req.user = { userId: "tch1", role: "teacher" };
    const middleware = authorize("teacher", "admin");
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("cho phép truy cập (gọi next) đối với vai trò student", () => {
    req.user = { userId: "std1", role: "student" };
    const middleware = authorize("student");
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("cho phép truy cập (gọi next) đối với vai trò parent", () => {
    req.user = { userId: "par1", role: "parent" };
    const middleware = authorize("parent");
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("hỗ trợ đa vai trò (hệ thống 4 role: admin, teacher, student, parent)", () => {
    const allowedRoles = ["admin", "teacher", "student", "parent"];
    const middleware = authorize(...allowedRoles);

    for (const role of allowedRoles) {
      const stepNext = jest.fn();
      middleware({ user: { role } }, res, stepNext);
      expect(stepNext).toHaveBeenCalledTimes(1);
    }
  });
});
