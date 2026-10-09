const gradebookService = require("./gradebook.service");
const excelService = require("./excel.service");

module.exports = {
  ...gradebookService,
  ...excelService,
};
