import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getServerConfig } from "../config.server";

const inviteEmailInput = z.object({
  email: z.string().email(),
  inviterName: z.string().min(1),
  groupName: z.string().min(1),
  inviteCode: z.string().min(1),
  invitationId: z.string().min(1),
  groupId: z.string().min(1),
});

function buildJoinUrl(appUrl: string, inviteCode: string) {
  const trimmed = appUrl.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  return `${trimmed}/groups?invite=${encodeURIComponent(inviteCode)}`;
}

export const sendInviteEmail = createServerFn({ method: "POST" })
  .validator(inviteEmailInput)
  .handler(async ({ data }) => {
    const config = getServerConfig();
    const from = config.resendFromEmail.trim();
    const apiKey = config.resendApiKey.trim();
    const joinUrl = buildJoinUrl(config.appUrl, data.inviteCode);

    if (!from || !apiKey) {
      return {
        sent: false,
        skipped: true,
        reason: "email_provider_not_configured",
      } as const;
    }

    const subject = `${data.inviterName} invited you to join ${data.groupName}`;
    const text = [
      `You were invited to join ${data.groupName} on Sajha.`,
      `Invitation ID: ${data.invitationId}`,
      `Group ID: ${data.groupId}`,
      `Invite code: ${data.inviteCode}`,
      joinUrl ? `Open this link to continue: ${joinUrl}` : "Open Sajha and enter the invite code to join.",
    ].join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px">You're invited to ${data.groupName}</h2>
        <p style="margin:0 0 12px">${data.inviterName} invited you to join their shared expense group on Sajha.</p>
        <p style="margin:0 0 12px"><strong>Invite code:</strong> ${data.inviteCode}</p>
        ${joinUrl ? `<p style="margin:0 0 20px"><a href="${joinUrl}" style="display:inline-block;background:#0a7c53;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">Open invite</a></p>` : ""}
        <p style="margin:0;color:#475569">If the button does not work, open Sajha and enter the invite code manually.</p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [data.email],
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail || `Email provider rejected the invite email (${response.status}).`);
    }

    return {
      sent: true,
      skipped: false,
      invitationId: data.invitationId,
    } as const;
  });
