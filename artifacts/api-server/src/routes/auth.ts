import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  SendOtpBody,
  SendOtpResponse,
  VerifyOtpBody,
  VerifyOtpResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const OTP_EXPIRES_IN_SECONDS = 10 * 60;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

type OtpChallenge = {
  salt: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
};

const challenges = new Map<string, OtpChallenge>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashCode(salt: string, code: string): string {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

function isSameHash(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return expectedBuffer.length === actualBuffer.length
    && timingSafeEqual(expectedBuffer, actualBuffer);
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error("Resend email configuration is incomplete");
  }

  return { apiKey, fromEmail };
}

async function sendVerificationEmail(email: string, code: string) {
  const { apiKey, fromEmail } = getResendConfig();
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: "Your ReceiptAI verification code",
      text: `Your ReceiptAI verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
      html: `<p>Your ReceiptAI verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
    }),
  });
}

router.post("/auth/otp/send", async (req, res) => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }

  const email = normalizeEmail(parsed.data.email);
  const existing = challenges.get(email);
  if (existing && Date.now() - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    res.status(429).json({ error: "Please wait before requesting another code." });
    return;
  }

  const code = randomInt(100000, 1000000).toString();
  const salt = randomBytes(16).toString("hex");
  challenges.set(email, {
    salt,
    codeHash: hashCode(salt, code),
    expiresAt: Date.now() + OTP_EXPIRES_IN_SECONDS * 1000,
    attempts: 0,
    lastSentAt: Date.now(),
  });

  try {
    const response = await sendVerificationEmail(email, code);
    if (!response.ok) {
      challenges.delete(email);
      req.log.error(
        { status: response.status },
        "Email provider rejected OTP delivery",
      );
      res.status(502).json({ error: "Email delivery is temporarily unavailable." });
      return;
    }

    res.json(
      SendOtpResponse.parse({
        success: true,
        expiresIn: OTP_EXPIRES_IN_SECONDS,
      }),
    );
  } catch (error) {
    challenges.delete(email);
    req.log.error({ err: error }, "Failed to send email OTP");
    res.status(502).json({ error: "Email delivery is temporarily unavailable." });
  }
});

router.post("/auth/otp/verify", async (req, res) => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter the 6-digit verification code." });
    return;
  }

  const email = normalizeEmail(parsed.data.email);
  const challenge = challenges.get(email);
  if (!challenge || Date.now() > challenge.expiresAt || challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    challenges.delete(email);
    res.json(VerifyOtpResponse.parse({ verified: false }));
    return;
  }

  challenge.attempts += 1;
  const verified = isSameHash(
    challenge.codeHash,
    hashCode(challenge.salt, parsed.data.code),
  );

  if (verified || challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    challenges.delete(email);
  }

  res.json(VerifyOtpResponse.parse({ verified }));
});

export default router;