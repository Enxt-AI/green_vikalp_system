import { google, forms_v1 } from "googleapis";
import prisma from "@db/client";
import { createOAuth2Client } from "./google-calendar";

/**
 * Get an authenticated Google Forms client for a user
 */
export async function getFormsClient(userId: string): Promise<forms_v1.Forms | null> {
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

    return google.forms({ version: "v1", auth: oauth2Client });
  } catch (error) {
    console.error("Error creating forms client:", error);
    return null;
  }
}

/**
 * Fetch form details (questions) from a Google Form
 */
export async function getFormQuestions(
  userId: string,
  formId: string
): Promise<{ id: string; title: string }[] | null> {
  const forms = await getFormsClient(userId);
  if (!forms) return null;

  try {
    const response = await forms.forms.get({
      formId,
    });

    const items = response.data.items || [];
    const questions: { id: string; title: string }[] = [];

    items.forEach(item => {
      if (item.questionItem && item.title) {
        questions.push({
          id: item.questionItem.question?.questionId || item.itemId || "",
          title: item.title,
        });
      }
    });

    return questions;
  } catch (error) {
    console.error("Error reading form questions:", error);
    return null;
  }
}

/**
 * Fetch form responses from a Google Form
 */
export async function getFormResponses(
  userId: string,
  formId: string
): Promise<forms_v1.Schema$FormResponse[] | null> {
  const forms = await getFormsClient(userId);
  if (!forms) return null;

  try {
    const response = await forms.forms.responses.list({
      formId,
    });

    return response.data.responses || [];
  } catch (error) {
    console.error("Error reading form responses:", error);
    return null;
  }
}
