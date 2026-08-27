import { createTransport, type Transporter } from "nodemailer";
import { SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from "@/constants.js";
import { getLogger } from "@/utils/logger.js";

let transporter: Transporter | null = null;

/**
 * Returns the SMTP transport, creating it on first use.
 *
 * In development this points at the smtp4dev container from `docker compose`,
 * which accepts everything and delivers nowhere — open its web UI on
 * http://localhost:5001 to read what was sent. Point `SMTP_*` at a real provider
 * for anything else.
 */
function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  transporter = createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    // smtp4dev listens without TLS. A real provider on 587 will upgrade via
    // STARTTLS, which nodemailer does automatically when `secure` is false.
    secure: SMTP_PORT === 465,
    ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
  });

  return transporter;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  /** Plain-text body. Keep transactional mail readable without HTML. */
  text: string;
  html?: string;
}

/**
 * Sends one email.
 *
 * Failures are logged and swallowed rather than thrown: Better Auth calls this
 * from inside its own handlers, and a dead mail server should not turn a
 * successful password-reset request into a 500 that tells an attacker whether the
 * address exists.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<void> {
  const log = getLogger();

  try {
    await getTransporter().sendMail({ from: SMTP_FROM, to, subject, text, html });

    log.withMetadata({ to, subject }).debug("Sent email");
  } catch (error) {
    log.withError(error).withMetadata({ to, subject }).error("Failed to send email");
  }
}

/**
 * Closes the SMTP pool during shutdown.
 * @internal
 */
export function closeMailer(): void {
  transporter?.close();
  transporter = null;
}
