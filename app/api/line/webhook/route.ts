import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";

type LineMessageEvent = {
  type: "message";
  replyToken?: string;
  source?: {
    type?: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    type?: string;
    text?: string;
  };
};

type LineJoinEvent = {
  type: "join";
  replyToken?: string;
  source?: {
    type?: string;
    groupId?: string;
    roomId?: string;
  };
};

type LineWebhookEvent = LineMessageEvent | LineJoinEvent | { type?: string };

type LineWebhookPayload = {
  destination?: string;
  events?: LineWebhookEvent[];
};

function getLineConfig() {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelSecret || !channelAccessToken) {
    throw new Error("LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN are required");
  }

  return { channelSecret, channelAccessToken };
}

function verifySignature(body: string, signature: string, channelSecret: string): boolean {
  if (!signature) return false;

  const expected = createHmac("sha256", channelSecret).update(body).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function replyMessage(replyToken: string, text: string, channelAccessToken: string) {
  const response = await fetch(LINE_REPLY_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LINE reply failed: ${response.status} ${errorText}`);
  }
}

function buildReplyText(userMessage: string) {
  const normalized = userMessage.trim().toLowerCase();

  if (["ping", "test", "ทดสอบ"].includes(normalized)) {
    return "ระบบ CareFlow พร้อมรับข้อความแล้ว";
  }

  return `ได้รับข้อความแล้ว: ${userMessage}`;
}

async function handleEvent(event: LineWebhookEvent, channelAccessToken: string) {
  if (event.type === "join" && "source" in event && event.source?.groupId) {
    console.info("[line] joined group:", event.source.groupId);

    if (event.replyToken) {
      await replyMessage(
        event.replyToken,
        "เชื่อมต่อ CareFlow กับกลุ่ม LINE นี้แล้ว",
        channelAccessToken
      );
    }

    return;
  }

  if (
    event.type === "message" &&
    "message" in event &&
    event.message?.type === "text" &&
    event.message.text &&
    event.replyToken
  ) {
    if (event.source?.groupId) {
      console.info("[line] group message from:", event.source.groupId);
    }

    await replyMessage(
      event.replyToken,
      buildReplyText(event.message.text),
      channelAccessToken
    );
  }
}

export async function POST(request: Request) {
  try {
    const { channelSecret, channelAccessToken } = getLineConfig();
    const body = await request.text();
    const signature = request.headers.get("x-line-signature") ?? "";

    if (!verifySignature(body, signature, channelSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body) as LineWebhookPayload;

    for (const event of payload.events ?? []) {
      await handleEvent(event, channelAccessToken);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LINE webhook error";
    console.error("[line] webhook error:", message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
