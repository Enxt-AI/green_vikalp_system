import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function run() {
  try {
    console.log("Testing S3 connection...", {
      region: process.env.AWS_REGION,
      accessKey: process.env.AWS_ACCESS_KEY_ID?.substring(0, 5) + "...",
    });
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    console.log("Success! Buckets:", response.Buckets?.map(b => b.Name));
  } catch (error) {
    console.error("Error connecting to S3:", error);
  }
}

run();
