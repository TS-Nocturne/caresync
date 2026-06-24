/**
 * Push notification delivery — uses FCM when configured, otherwise logs for dev.
 */

export async function sendPushNotification(params: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<boolean> {
  const serverKey = process.env.FCM_SERVER_KEY;

  if (!serverKey) {
    console.info("[push] FCM_SERVER_KEY not set — notification logged only:", params.title, params.body);
    return false;
  }

  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${serverKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: params.token,
      notification: { title: params.title, body: params.body },
      data: params.data ?? {},
    }),
  });

  return response.ok;
}

export async function sendPushToUser(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<number> {
  let sent = 0;
  for (const token of tokens) {
    const ok = await sendPushNotification({ token, title, body, data });
    if (ok) sent += 1;
  }
  return sent;
}
