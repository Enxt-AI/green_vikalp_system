import { google, sheets_v4 } from "googleapis";
import prisma from "@db/client";
import { createOAuth2Client } from "./google-calendar";

/**
 * Get an authenticated Google Sheets client for a user
 */
export async function getSheetsClient(userId: string): Promise<sheets_v4.Sheets | null> {
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

    return google.sheets({ version: "v4", auth: oauth2Client });
  } catch (error) {
    console.error("Error creating sheets client:", error);
    return null;
  }
}

/**
 * Read data from a specific Google Sheet
 */
export async function readSheetData(
  userId: string,
  spreadsheetId: string,
  range: string
): Promise<string[][] | null> {
  const sheets = await getSheetsClient(userId);
  if (!sheets) return null;

  try {
    // If the user specifies an exact sheet (e.g., "Sheet1!A1:Z1000"), just fetch that one
    if (range.includes("!")) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      return response.data.values || null;
    }

    // Otherwise, fetch ALL sheets and combine them
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitles = meta.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[];

    if (!sheetTitles || sheetTitles.length === 0) return null;

    const ranges = sheetTitles.map(title => `${title}!${range}`);
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });

    if (!response.data.valueRanges) return null;

    let allRows: string[][] = [];
    response.data.valueRanges.forEach((vr, idx) => {
      const values = vr.values || [];
      if (values.length === 0) return;

      if (idx === 0) {
        // First sheet: include the header row
        allRows.push(...values);
      } else {
        // Subsequent sheets: skip the header row so we don't import headers as leads
        allRows.push(...values.slice(1));
      }
    });

    return allRows;
  } catch (error: any) {
    console.error("Error reading sheet data:", error);
    throw new Error(error.message || "Failed to read data from Google Sheets");
  }
}
