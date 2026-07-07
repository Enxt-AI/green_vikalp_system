import { uploadToS3 } from "./lib/s3.ts";

async function run() {
  const mockFile = {
    fieldname: "file",
    originalname: "test.xlsx",
    encoding: "7bit",
    mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("dummy data"),
    size: 10,
  } as Express.Multer.File;

  console.log("Calling uploadToS3...");
  const result = await uploadToS3(mockFile, "test-key.xlsx");
  console.log("Result:", result);
}

run();
