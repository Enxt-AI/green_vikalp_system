import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function run() {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || "crm-documents",
      Key: "test-file.txt",
      Body: Buffer.from("hello world"),
      ContentType: "text/plain",
    });

    await s3Client.send(command);
    console.log("Success");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

run();
