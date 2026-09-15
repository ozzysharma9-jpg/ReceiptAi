import { Router, type IRouter } from "express";
import {
  SendOtpBody,
  SendOtpResponse,
  VerifyOtpBody,
  VerifyOtpResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const TWILIO_VERIFY_BASE_URL = "https://verify.twilio.com/v2/Services";
const OTP_EXPIRES_IN_SECONDS = 10 * 60;

function normalizeIndianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  const indianDigits = digits.startsWith("91") && digits.length === 12
    ? digits.slice(2)
    : digits;

  if (!/^[6-9]\d{9}$/.test(indianDigits)) {
    return null;
  }

  return `+91${indianDigits}`;
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifyServiceSid) {
    throw new Error("Twilio OTP configuration is incomplete");
  }

  return { accountSid, authToken, verifyServiceSid };
}

async function callTwilioVerify(
  endpoint: "Verifications" | "VerificationCheck",
  fields: Record<string, string>,
) {
  const { accountSid, authToken, verifyServiceSid } = getTwilioConfig();
  const encodedCredentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const body = new URLSearchParams(fields).toString();

  return fetch(`${TWILIO_VERIFY_BASE_URL}/${verifyServiceSid}/${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${encodedCredentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

router.post("/auth/otp/send", async (req, res) => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid Indian mobile number." });
    return;
  }

  const phone = normalizeIndianPhone(parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: "Enter a valid Indian mobile number." });
    return;
  }

  try {
    const response = await callTwilioVerify("Verifications", {
      To: phone,
      Channel: "sms",
    });

    if (!response.ok) {
      const providerBody = await response.text();
      req.log.error(
        { status: response.status, providerBody },
        "Twilio rejected OTP delivery",
      );
      res.status(502).json({ error: "SMS delivery is temporarily unavailable." });
      return;
    }

    res.json(
      SendOtpResponse.parse({
        success: true,
        expiresIn: OTP_EXPIRES_IN_SECONDS,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Failed to send OTP");
    res.status(502).json({ error: "SMS delivery is temporarily unavailable." });
  }
});

router.post("/auth/otp/verify", async (req, res) => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter the 6-digit verification code." });
    return;
  }

  const phone = normalizeIndianPhone(parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: "Enter a valid Indian mobile number." });
    return;
  }

  try {
    const response = await callTwilioVerify("VerificationCheck", {
      To: phone,
      Code: parsed.data.code,
    });

    if (!response.ok) {
      const providerBody = await response.text();
      req.log.warn(
        { status: response.status, providerBody },
        "Twilio rejected OTP verification",
      );
      res.json(VerifyOtpResponse.parse({ verified: false }));
      return;
    }

    const providerBody = (await response.json()) as { status?: string };
    res.json(
      VerifyOtpResponse.parse({
        verified: providerBody.status === "approved",
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Failed to verify OTP");
    res.status(502).json({ error: "OTP verification is temporarily unavailable." });
  }
});

export default router;