import "server-only";
import { Resend } from "resend";
import { site } from "@/config/site";

// Versendet eine E-Mail über Resend. Ohne RESEND_API_KEY wird sie nur protokolliert.
export async function sendMail(to: string, subject: string, text: string) {
  const body = `${text}\n\n—\n${site.name} · ${site.claim}`;
  if (!process.env.RESEND_API_KEY) {
    console.log(`[E-Mail, nicht versendet: RESEND_API_KEY fehlt] An: ${to} | Betreff: ${subject}\n${body}`);
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.MAIL_FROM || `${site.name} <onboarding@resend.dev>`,
      to,
      subject,
      text: body,
    });
    if (error) console.error("E-Mail-Versand fehlgeschlagen:", error);
  } catch (e) {
    console.error("E-Mail-Versand fehlgeschlagen:", e);
  }
}
