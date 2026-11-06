/**
 * Script kiểm tra cấu hình & kết nối Cloudinary.
 * Chạy: npm run test:cloudinary   (hoặc: node src/scripts/test_cloudinary.js)
 * Thêm cờ --upload để thử upload + xóa một file TXT nhỏ (resource_type raw).
 */
require("dotenv").config({ quiet: true });
const {
  checkCloudinaryConnection,
  CLOUDINARY_FOLDERS,
  FILE_CATEGORIES,
  uploadFileToCloudinary,
  deleteFromCloudinary,
} = require("../config/cloudinary");

const mask = (value) => (value ? "[Đã cấu hình]" : "[Chưa cấu hình]");

const runTest = async () => {
  console.log("==========================================");
  console.log("   KIỂM TRA CẤU HÌNH VÀ KẾT NỐI CLOUDINARY");
  console.log("==========================================");

  console.log("\n1. Thông tin cấu hình biến môi trường:");
  console.log(
    `- CLOUDINARY_CLOUD_NAME: ${mask(process.env.CLOUDINARY_CLOUD_NAME)}`
  );
  console.log(
    `- CLOUDINARY_API_KEY:    ${mask(process.env.CLOUDINARY_API_KEY)}`
  );
  console.log(
    `- CLOUDINARY_API_SECRET: ${mask(process.env.CLOUDINARY_API_SECRET)}`
  );

  console.log("\n2. Phân loại thư mục lưu trữ:");
  Object.entries(FILE_CATEGORIES).forEach(([category, config]) => {
    const exts = Object.keys(config.extensions).join(", ");
    console.log(
      `- ${category.padEnd(13)} -> ${config.folder.padEnd(22)} [${config.resourceType}] ${exts}`
    );
  });

  console.log("\n3. Đang kiểm tra kết nối tới Cloudinary API...");
  const result = await checkCloudinaryConnection();

  if (!result.success) {
    console.error(" Kết nối thất bại!");
    console.error(`- Nguyên nhân: ${result.message}`);
    console.log(
      "\n Gợi ý: Hãy kiểm tra lại các thông tin khai báo trong file .env!"
    );
    process.exitCode = 1;
    return;
  }

  console.log(" Kết nối thành công tới Cloudinary!");
  console.log(`- Trạng thái phản hồi: ${result.status || "OK"}`);

  if (process.argv.includes("--upload")) {
    console.log(
      `\n4. Thử upload file TXT vào ${CLOUDINARY_FOLDERS.DOCUMENTS} ...`
    );
    try {
      const uploaded = await uploadFileToCloudinary({
        buffer: Buffer.from(
          `Edu-LMS Cloudinary test ${new Date().toISOString()}`
        ),
        originalname: "edulms-connection-test.txt",
        mimetype: "text/plain",
      });
      console.log(` Upload thành công: ${uploaded.url}`);

      await deleteFromCloudinary(uploaded.publicId, uploaded.resourceType);
      console.log(" Đã xóa file test khỏi Cloudinary.");
    } catch (error) {
      console.error(` Upload thất bại: ${error.message}`);
      process.exitCode = 1;
    }
  }
  console.log("==========================================\n");
};

runTest();
