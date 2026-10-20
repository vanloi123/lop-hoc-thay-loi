/* Kênh nhắn tin thời gian thực giữa máy chiếu và điện thoại (Supabase Realtime · Broadcast).
   Tin nhắn chỉ chuyển tiếp qua máy chủ, không lưu vào cơ sở dữ liệu. */
import { RealtimeClient } from "@supabase/realtime-js";

const ALPHA = "abcdefghjkmnpqrstuvwxyz23456789"; // bỏ các ký tự dễ nhầm: i, l, o, 0, 1
export function randomId(len) {
  const a = new Uint8Array(len); crypto.getRandomValues(a);
  return [...a].map(x => ALPHA[x % ALPHA.length]).join("");
}

/* Địa chỉ máy chủ thời gian thực. Có thể ghi đè bằng localStorage["lhtl.rt"] để kiểm thử với máy chủ cục bộ. */
function endpoint(url) {
  try { const o = localStorage.getItem("lhtl.rt"); if (o) return o; } catch (e) {}
  return url.replace(/^http/, "ws").replace(/\/+$/, "") + "/realtime/v1";
}

/**
 * Mở kênh `name`.
 * onMsg(payload) — nhận tin; onStatus(state) — "connecting" | "online" | "error" | "closed"
 */
export function openChannel({ url, key, name, onMsg, onStatus }) {
  const client = new RealtimeClient(endpoint(url), {
    params: { apikey: key }, vsn: "1.0.0", heartbeatIntervalMs: 20000,
    reconnectAfterMs: tries => [1000, 2000, 4000, 8000][tries - 1] || 10000,
  });
  const ch = client.channel("lhtl-remote-" + name, { config: { broadcast: { self: false, ack: false } } });
  let online = false, closed = false;
  ch.on("broadcast", { event: "m" }, msg => { try { onMsg(msg.payload); } catch (e) { console.error(e); } });
  onStatus("connecting");
  ch.subscribe(status => {
    if (closed) return;
    online = status === "SUBSCRIBED";
    onStatus(online ? "online" : status === "CLOSED" ? "closed" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "error" : "connecting");
  });
  return {
    get online() { return online; },
    send(payload) {
      if (!online) return false;
      ch.send({ type: "broadcast", event: "m", payload }).catch(() => {});
      return true;
    },
    close() { closed = true; online = false; try { client.removeAllChannels(); client.disconnect(); } catch (e) {} },
  };
}
