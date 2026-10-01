import nodemailer from "nodemailer";

let transporter = null;

const isEmailConfigured = () =>
  process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

const getTransporter = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
};

const wrapHtml = (title, bodyHtml) => `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #16181D;">
    <p style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">rasta<span style="color: #E8A33D;">.</span></p>
    <h2 style="font-size: 18px; margin-top: 24px;">${title}</h2>
    <div style="font-size: 14px; line-height: 1.6; color: #333;">${bodyHtml}</div>
    <p style="font-size: 12px; color: #999; margin-top: 32px;">— rasta, built for people between jobs and the jobs waiting for them.</p>
  </div>
`;

/**
 * Sends an email. Silently no-ops (with a console log) if EMAIL_* env vars
 * aren't configured — so the app keeps working in dev without SMTP set up.
 */
export const sendEmail = async ({ to, subject, title, bodyHtml }) => {
  if (!isEmailConfigured()) {
    console.log(`[email skipped — not configured] To: ${to} | Subject: ${subject}`);
    return { sent: false, reason: "not_configured" };
  }

  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || `"rasta" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: wrapHtml(title, bodyHtml),
    });
    return { sent: true };
  } catch (err) {
    console.error("Email send failed:", err.message);
    return { sent: false, reason: err.message };
  }
};

export const emailTemplates = {
  welcome: (name) => ({
    subject: "Welcome to rasta",
    title: `Welcome, ${name}!`,
    bodyHtml: `<p>Your account is ready. Start browsing openings or post your first role — whichever brought you here.</p>`,
  }),
  newApplicant: (jobTitle, applicantName) => ({
    subject: `New applicant for ${jobTitle}`,
    title: "You have a new applicant",
    bodyHtml: `<p><strong>${applicantName}</strong> just applied to <strong>${jobTitle}</strong>. Log in to review their application.</p>`,
  }),
  statusUpdate: (jobTitle, status) => ({
    subject: `Update on your application — ${jobTitle}`,
    title: "Your application status changed",
    bodyHtml: `<p>Your application for <strong>${jobTitle}</strong> is now marked as <strong>${status}</strong>.</p>`,
  }),
  passwordReset: (resetUrl) => ({
    subject: "Reset your rasta password",
    title: "Reset your password",
    bodyHtml: `<p>We received a request to reset your password. This link expires in 30 minutes.</p>
    <p style="margin-top:16px;"><a href="${resetUrl}" style="background:#0B1220;color:#F7F5EF;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Reset password</a></p>
    <p style="margin-top:16px;font-size:12px;color:#999;">If you didn't request this, you can safely ignore this email.</p>`,
  }),
};
