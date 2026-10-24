const gradebookService = require("./gradebook.service");
const excelService = require("./excel.service");
const importService = require("./import.service");

module.exports = {
  ...gradebookService,
  ...excelService,
  ...importService,
};
