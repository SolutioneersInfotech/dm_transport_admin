import { goOffline, goOnline } from "firebase/database";
import { database } from "../firebase/firebaseApp";

let isReconnectInFlight = false;
let lastReconnectAt = 0;

export function forceRealtimeReconnect() {
  const now = Date.now();

  // Avoid overlapping reconnect storms when multiple resume events fire close together.
  if (isReconnectInFlight || now - lastReconnectAt < 1000) {
    return;
  }

  isReconnectInFlight = true;
  lastReconnectAt = now;

  goOffline(database);

  setTimeout(() => {
    goOnline(database);
    isReconnectInFlight = false;
  }, 150);
}

export default forceRealtimeReconnect;
