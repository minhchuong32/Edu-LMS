require("dotenv").config();
const {
  checkCloudinaryConnection,
  CLOUDINARY_FOLDERS,
} = require("../config/cloudinary");

const runTest = async () => {
  console.log("==========================================");
  console.log("   KIỂM TRA CẤU HÌNH VÀ KẾT NỐI CLOUDINARY");
  console.log("==========================================");

  console.log("\n1. Thông tin cấu hình biến môi trường:");
  console.log(
    `- CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? "[Đã cấu hình]" : "[Chưa cấu hình]"}`
  );
  console.log(
    `- CLOUDINARY_API_KEY:    ${process.env.CLOUDINARY_API_KEY ? "[Đã cấu hình]" : "[Chưa cấu hình]"}`
  );
  console.log(
    `- CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? "[Đã cấu hình]" : "[Chưa cấu hình]"}`
  );

  console.log("\n2. Cấu hình thư mục lưu trữ:");
  console.log(`- Documents folder: ${CLOUDINARY_FOLDERS.DOCUMENTS}`);
  console.log(`- Videos folder:    ${CLOUDINARY_FOLDERS.VIDEOS}`);

  console.log("\n3. Đang kiểm tra kết nối tới Cloudinary API...");
  const result = await checkCloudinaryConnection();

  if (result.success) {
    console.log(" Kết nối thành công tới Cloudinary!");
    console.log(`- Trạng thái phản hồi: ${result.status || "OK"}`);
  } else {
    console.error(" Kết nối thất bại!");
    console.error(`- Nguyên nhân: ${result.message}`);
    console.log(
      "\n Gợi ý: Hãy kiểm tra lại các thông tin khai báo trong file .env!"
    );
  }
  console.log("==========================================\n");
};

runTest();
