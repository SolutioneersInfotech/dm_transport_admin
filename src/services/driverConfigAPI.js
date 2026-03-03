import { ref, get, set } from "firebase/database";
import { database } from "../firebase/firebaseApp";

function resolveDriverConfigId(driver) {
  if (!driver) return null;

  const id =
    typeof driver.id === "string" ? driver.id.trim() : "";
  const rawPhone =
    typeof driver.phone === "string"
      ? driver.phone.replace(/\D/g, "").trim()
      : "";

  // Prefer stable Firestore id; fall back to numeric phone if needed
  return id || rawPhone || null;
}

export async function getShowMaintenanceChat(target) {
  const driverId =
    typeof target === "string"
      ? target.trim()
      : resolveDriverConfigId(target);

  if (!driverId) return false;

  const snapshot = await get(
    ref(database, `configuration/${driverId}/showMaintenanceChat`)
  );
  console.log(
    "Puneet run maintenanceChat snapshot for driver",
    driverId,
    snapshot
  );
  if (!snapshot.exists()) return false;
  console.log(
    "Puneet Fetched maintenanceChat config for driver",
    driverId,
    snapshot.val()
  );
  const value = snapshot.val();
  return value === true;
}

export async function setShowMaintenanceChat(driver, value) {
  const driverId = resolveDriverConfigId(driver);
  if (!driverId) {
    throw new Error("Missing driver id/phone for maintenance config.");
  }

  await set(
    ref(database, `configuration/${driverId}/showMaintenanceChat`),
    !!value
  );
}
