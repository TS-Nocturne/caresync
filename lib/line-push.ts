const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

export async function sendLinePushMessage(userId: string, text: string) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    console.warn("[line] LINE_CHANNEL_ACCESS_TOKEN is not configured. Skipping push message.");
    return false;
  }

  try {
    const response = await fetch(LINE_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[line] Failed to send push message: ${response.status} ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[line] Exception sending push message:", error);
    return false;
  }
}
