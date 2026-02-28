import { ref, get, set } from "firebase/database";
import { database } from "../firebase/firebaseApp";

function resolveDriverConfigId(driver) {
  if (!driver) return null;
  const phone = typeof driver.phone === "string" ? driver.phone.trim() : "";
  const id = typeof driver.id === "string" ? driver.id.trim() : "";
  return phone || id || null;
}

export async function getShowMaintenanceChat(driverId) {
  if (!driverId) return false;

  const snapshot = await get(
    ref(database, `configuration/${driverId}/showMaintenanceChat`)
  );
  console.log("Puneet run maintenanceChat snapshot for driver", driverId, snapshot);
  if (!snapshot.exists()) return false;
  console.log("Puneet Fetched maintenanceChat config for driver", driverId, snapshot.val());
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
