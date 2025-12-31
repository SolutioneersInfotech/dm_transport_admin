import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { firestore } from "../firebase/firebaseApp";

export const subscribeNotesNotifications = (onChange) => {
  const notesQuery = query(
    collection(firestore, "Notes_notifications"),
    orderBy("timestamp", "desc")
  );

  return onSnapshot(notesQuery, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => {
      const data = doc.data() ?? {};
      return {
        docId: doc.id,
        id: data.id ?? doc.id,
        message: data.message ?? "",
        type: data.type ?? "",
        documentId: data.document_id ?? "",
        userid: data.userid ?? "",
        timestamp: data.timestamp ?? null,
      };
    });
    onChange(notifications);
  });
};

export const deleteAllNotesNotifications = async () => {
  const snapshot = await getDocs(
    collection(firestore, "Notes_notifications")
  );
  const batch = writeBatch(firestore);

  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};

export const deleteNotesNotificationByTimestamp = async (timestamp) => {
  if (timestamp == null) {
    console.warn("Notes notification timestamp is missing.");
    return;
  }

  const notesQuery = query(
    collection(firestore, "Notes_notifications"),
    where("timestamp", "==", timestamp)
  );
  const snapshot = await getDocs(notesQuery);
  const batch = writeBatch(firestore);

  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};
