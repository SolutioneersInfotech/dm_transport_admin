import { ref, get, set } from "firebase/database";
import { database } from "../firebase/firebaseApp";

function getCandidateConfigIds(driver) {
  if (!driver) return [];

  const candidates = [];

  function add(value) {
    if (!value) return;
    const str = String(value).trim();
    if (!str) return;
    if (!candidates.includes(str)) {
      candidates.push(str);
    }
  }

  // Prefer phone / contact-like identifiers first (matches legacy behaviour)
  add(driver.phone);
  add(driver.contactId);
  add(driver.contactid);

  // Then fall back to user-related ids
  add(driver.userid);
  add(driver.userId);
  add(driver.uid);
  add(driver.id);

  return candidates;
}

export async function getShowMaintenanceChat(driver) {
  const ids = getCandidateConfigIds(driver);
  if (!ids.length) return false;

  for (const id of ids) {
    try {
      const snapshot = await get(
        ref(database, `configuration/${id}/showMaintenanceChat`)
      );

      if (!snapshot.exists()) {
        continue;
      }

      const value = snapshot.val();

      // Accept true / "true" / 1 as ON
      if (value === true || value === "true" || value === 1) {
        return true;
      }
      if (value === false || value === "false" || value === 0) {
        return false;
      }

      // Unknown type -> default OFF
      return false;
    } catch (error) {
      console.error(
        "[driverConfigAPI] Failed to read showMaintenanceChat for config id:",
        id,
        error
      );
    }
  }

  // No config found
  return false;
}

export async function setShowMaintenanceChat(driver, value) {
  const ids = getCandidateConfigIds(driver);
  if (!ids.length) {
    throw new Error("Missing driver identifier for maintenance config.");
  }

  const id = ids[0];

  try {
    await set(
      ref(database, `configuration/${id}/showMaintenanceChat`),
      !!value
    );
  } catch (error) {
    console.error(
      "[driverConfigAPI] Failed to write showMaintenanceChat for config id:",
      id,
      error
    );
    throw error;
  }
}
