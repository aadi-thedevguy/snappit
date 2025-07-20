import aj, {
  ArcjetDecision,
  shield,
  slidingWindow,
  validateEmail,
} from "@/lib/arcjet";
import ip from "@arcjet/ip";
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const emailValidation = aj.withRule(
  validateEmail({
    mode: "LIVE",
    block: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
  })
);

const rateLimit = aj.withRule(
  slidingWindow({
    mode: "LIVE",
    interval: "1m",
    max: 30,
    characteristics: ["fingerprint"],
  })
);

const shieldValidation = aj.withRule(
  shield({
    mode: "LIVE",
  })
);

const protectedAuth = async (req: NextRequest): Promise<ArcjetDecision> => {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  let userId: string;
  if (session?.user.id) {
    userId = session.user.id;
  } else {
    userId = ip(req) || "127.0.0.1";
  }
  if (req.nextUrl.pathname.startsWith("/api/auth/sign-in")) {
    const body = await req.clone().json();
    if (typeof body.email === "string") {
      return emailValidation.protect(req, {
        email: body.email,
      });
    }
  }
  if (!req.nextUrl.pathname.startsWith("/api/auth/sign-out")) {
    return rateLimit.protect(req, {
      fingerprint: userId,
    });
  }
  return shieldValidation.protect(req);
};

const authHandlers = toNextJsHandler(auth.handler);

export const { GET } = authHandlers;

export const POST = async (req: NextRequest) => {

  try {
    const decision = await protectedAuth(req);
    if (decision.isDenied()) {
      if (decision.reason.isEmail()) {
        return NextResponse.json({ message: "Email validation failed" }, { status: 400 });
      }
      if (decision.reason.isRateLimit()) {
        return NextResponse.json({ message: "Rate limit exceeded" }, { status: 429 });
      }
      if (decision.reason.isShield()) {
        return NextResponse.json({ message: "Shield validation failed" }, { status: 400 });
      }
    }

  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }

  return authHandlers.POST(req);
};
