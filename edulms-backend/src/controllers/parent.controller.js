const parentService = require("../services/parent.service");
const ApiResponse = require("../utils/ApiResponse");

/**
 * Controller to handle parent fetching own children
 * GET /api/v1/parents/me/children
 */
const getMyChildren = async (req, res, next) => {
  try {
    const children = await parentService.getMyChildren(req.user);

    res.status(200).json(
      new ApiResponse(200, children, "Lấy danh sách con em thành công.")
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyChildren,
};
