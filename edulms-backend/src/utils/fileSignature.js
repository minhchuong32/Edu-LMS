/**
 * Nhận diện định dạng thật của file dựa trên chữ ký nội dung (magic bytes),
 * không phụ thuộc tên file hay MIME type do client gửi lên.
 *
 * Kết quả trả về là một "format id":
 *   pdf | rtf | doc | xls | ppt | docx | xlsx | pptx | zip | rar | 7z |
 *   jpeg | png | webp | mp4 | mov | webm | text | null (không nhận diện được)
 */

const startsWith = (buffer, bytes, offset = 0) => {
  if (buffer.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i += 1) {
    if (buffer[offset + i] !== bytes[i]) return false;
  }
  return true;
};

const containsAscii = (buffer, text, end = buffer.length) =>
  buffer.subarray(0, end).indexOf(text, 0, "latin1") !== -1;

const containsUtf16 = (buffer, text) => buffer.indexOf(Buffer.from(text, "utf16le")) !== -1;

// ===================== Chữ ký từng định dạng =====================

const SIGNATURES = {
  OLE_CFB: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // DOC/XLS/PPT (Office 97-2003)
  ZIP_LOCAL: [0x50, 0x4b, 0x03, 0x04], // PK\x03\x04
  ZIP_EMPTY: [0x50, 0x4b, 0x05, 0x06], // PK\x05\x06 (ZIP rỗng)
  ZIP_SPANNED: [0x50, 0x4b, 0x07, 0x08], // PK\x07\x08
  RAR4: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00], // Rar!\x1A\x07\x00
  RAR5: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00], // Rar!\x1A\x07\x01\x00
  SEVEN_ZIP: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], // 7z\xBC\xAF\x27\x1C
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  EBML: [0x1a, 0x45, 0xdf, 0xa3], // WebM / MKV
};

/** PDF: chuẩn ISO 32000 cho phép "%PDF-" nằm trong 1024 byte đầu tiên */
const detectPdf = (buffer) => (containsAscii(buffer, "%PDF-", 1024) ? "pdf" : null);

/**
 * Office 97-2003 (OLE Compound File): phân biệt bằng tên stream (UTF-16LE)
 * trong directory: WordDocument | PowerPoint Document | Workbook/Book.
 */
const detectOle = (buffer) => {
  if (!startsWith(buffer, SIGNATURES.OLE_CFB)) return null;
  if (containsUtf16(buffer, "WordDocument")) return "doc";
  if (containsUtf16(buffer, "PowerPoint Document")) return "ppt";
  if (containsUtf16(buffer, "Workbook") || containsUtf16(buffer, "Book")) return "xls";
  return "ole"; // OLE không xác định (vd: file Office bị mã hóa) -> không được chấp nhận
};

/**
 * ZIP và Office Open XML (DOCX/XLSX/PPTX đều là ZIP chứa [Content_Types].xml
 * và thư mục word/ | ppt/ | xl/).
 */
const detectZipFamily = (buffer) => {
  if (startsWith(buffer, SIGNATURES.ZIP_EMPTY) || startsWith(buffer, SIGNATURES.ZIP_SPANNED)) {
    return "zip";
  }
  if (!startsWith(buffer, SIGNATURES.ZIP_LOCAL)) return null;

  if (containsAscii(buffer, "[Content_Types].xml")) {
    if (containsAscii(buffer, "word/")) return "docx";
    if (containsAscii(buffer, "ppt/")) return "pptx";
    if (containsAscii(buffer, "xl/")) return "xlsx";
  }
  return "zip";
};

const detectArchive = (buffer) => {
  if (startsWith(buffer, SIGNATURES.RAR4) || startsWith(buffer, SIGNATURES.RAR5)) return "rar";
  if (startsWith(buffer, SIGNATURES.SEVEN_ZIP)) return "7z";
  return null;
};

const detectImage = (buffer) => {
  if (startsWith(buffer, SIGNATURES.JPEG)) return "jpeg";
  if (startsWith(buffer, SIGNATURES.PNG)) return "png";
  if (buffer.length >= 12 && buffer.toString("latin1", 0, 4) === "RIFF" && buffer.toString("latin1", 8, 12) === "WEBP") {
    return "webp";
  }
  return null;
};

// Các atom hợp lệ ở đầu file QuickTime cũ (không có ftyp)
const QUICKTIME_LEGACY_ATOMS = ["moov", "mdat", "wide", "free", "skip"];

/**
 * Video:
 *  - MP4/MOV (ISO Base Media): byte 4..7 = "ftyp", brand "qt  " -> mov, còn lại -> mp4
 *  - MOV đời cũ: byte 4..7 là atom QuickTime (moov, mdat, wide...)
 *  - WebM: EBML header 1A 45 DF A3 + DocType "webm" (phân biệt với MKV)
 */
const detectVideo = (buffer) => {
  if (buffer.length < 12) return null;

  const boxType = buffer.toString("latin1", 4, 8);
  if (boxType === "ftyp") {
    return buffer.toString("latin1", 8, 12) === "qt  " ? "mov" : "mp4";
  }
  if (QUICKTIME_LEGACY_ATOMS.includes(boxType)) return "mov";

  if (startsWith(buffer, SIGNATURES.EBML) && containsAscii(buffer, "webm", 64)) {
    return "webm";
  }
  return null;
};

/** RTF: bắt đầu bằng "{\rtf" */
const detectRtf = (buffer) => (containsAscii(buffer, "{\\rtf", 8) ? "rtf" : null);

/**
 * TXT/CSV không có magic bytes -> kiểm tra heuristic "là văn bản thuần":
 *  - Cho phép BOM UTF-8 / UTF-16.
 *  - Không chứa byte NUL và ký tự điều khiển nhị phân (trừ \t \n \r \f ESC).
 *  - Không yêu cầu UTF-8 hợp lệ vì CSV xuất từ Excel có thể dùng mã ANSI.
 * Kiểm tra toàn bộ buffer để chặn file "văn bản ở đầu, nhị phân ở sau".
 */
const isLikelyText = (buffer) => {
  if (buffer.length === 0) return false;
  if (startsWith(buffer, [0xff, 0xfe]) || startsWith(buffer, [0xfe, 0xff])) return true; // UTF-16

  const start = startsWith(buffer, [0xef, 0xbb, 0xbf]) ? 3 : 0; // UTF-8 BOM
  for (let i = start; i < buffer.length; i += 1) {
    const byte = buffer[i];
    if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d && byte !== 0x0c && byte !== 0x1b) {
      return false;
    }
    if (byte === 0x7f) return false;
  }
  return true;
};

/**
 * Nhận diện định dạng thật của buffer.
 * Thứ tự kiểm tra: định dạng nhị phân có chữ ký rõ ràng trước, văn bản thuần sau cùng.
 * @param {Buffer} buffer
 * @returns {string|null}
 */
const detectFileFormat = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  return (
    detectPdf(buffer) ||
    detectRtf(buffer) ||
    detectOle(buffer) ||
    detectZipFamily(buffer) ||
    detectArchive(buffer) ||
    detectImage(buffer) ||
    detectVideo(buffer) ||
    (isLikelyText(buffer) ? "text" : null)
  );
};

module.exports = {
  SIGNATURES,
  detectFileFormat,
  detectPdf,
  detectRtf,
  detectOle,
  detectZipFamily,
  detectArchive,
  detectImage,
  detectVideo,
  isLikelyText,
};

