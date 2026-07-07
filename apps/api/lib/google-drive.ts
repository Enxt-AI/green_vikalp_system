import { google, drive_v3 } from "googleapis";
import prisma from "@db/client";
import { createOAuth2Client } from "./google-calendar";

/**
 * Get an authenticated Google Drive client for a user
 */
export async function getDriveClient(userId: string): Promise<drive_v3.Drive | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleRefreshToken: true },
  });

  if (!user?.googleRefreshToken) {
    return null;
  }

  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: user.googleRefreshToken,
    });

    return google.drive({ version: "v3", auth: oauth2Client });
  } catch (error) {
    console.error("Error creating drive client:", error);
    return null;
  }
}

/**
 * Fetch folders from Google Drive
 */
export async function getDriveFolders(userId: string): Promise<{ id: string; name: string }[] | null> {
  const drive = await getDriveClient(userId);
  if (!drive) return null;

  try {
    let allFiles: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: "nextPageToken, files(id, name)",
        orderBy: "name",
        pageSize: 1000,
        pageToken: pageToken,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      allFiles = allFiles.concat(response.data.files || []);
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return allFiles.map(file => ({
      id: file.id || "",
      name: file.name || "",
    }));
  } catch (error) {
    console.error("Error fetching drive folders:", error);
    return null;
  }
}

/**
 * Fetch spreadsheet and CSV files from Google Drive
 */
export async function getDriveSpreadsheets(userId: string, folderId?: string): Promise<{ id: string; name: string; mimeType: string }[] | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleDriveFolderId: true },
  });

  const drive = await getDriveClient(userId);
  if (!drive) return null;

  try {
    let allFiles: any[] = [];
    let pageToken: string | undefined = undefined;

    const targetFolderId = folderId || user?.googleDriveFolderId;
    if (!targetFolderId) {
      return [];
    }

    let query = "(mimeType='application/vnd.google-apps.spreadsheet' or mimeType='text/csv' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel') and trashed=false";

    query += ` and '${targetFolderId}' in parents`;

    do {
      const response = await drive.files.list({
        q: query,
        fields: "nextPageToken, files(id, name, mimeType)",
        orderBy: "modifiedTime desc",
        pageSize: 100,
        pageToken: pageToken,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      allFiles = allFiles.concat(response.data.files || []);
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return allFiles.map(file => ({
      id: file.id || "",
      name: file.name || "",
      mimeType: file.mimeType || "",
    }));
  } catch (error) {
    console.error("Error fetching drive spreadsheets:", error);
    throw error;
  }
}

/**
 * Download a file from Google Drive
 */
export async function downloadDriveFile(userId: string, fileId: string): Promise<Buffer | null> {
  const drive = await getDriveClient(userId);
  if (!drive) return null;

  try {
    // First get the file metadata to check its type
    const fileMetadata = await drive.files.get({
      fileId,
      fields: "mimeType, name",
      supportsAllDrives: true,
    });

    const mimeType = fileMetadata.data.mimeType;

    let response;

    // If it's a Google Sheet, we must export it
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      response = await drive.files.export(
        {
          fileId,
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        { responseType: "arraybuffer" }
      );
    } else {
      // Otherwise download it directly
      response = await drive.files.get(
        {
          fileId,
          alt: "media",
          supportsAllDrives: true,
        },
        { responseType: "arraybuffer" }
      );
    }

    return Buffer.from(response.data as ArrayBuffer);
  } catch (error) {
    console.error(`Error downloading drive file ${fileId}:`, error);
    return null;
  }
}
