import { initializeApp, getApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const fallbackConfig = {
  apiKey: "AIzaSyB1es2F0tPhDZnYvikI7D6lAUZsokfBPGo",
  authDomain: "dmtransport-1.firebaseapp.com",
  projectId: "dmtransport-1",
  storageBucket: "dmtransport-1.appspot.com",
  messagingSenderId: "520692343980",
  appId: "1:520692343980:web:7f4fec6850118d6ccaeb09",
  measurementId: "G-6N4RH3DF46",
  databaseURL:
    "https://dmtransport-1-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    fallbackConfig.databaseURL,
};

const firebaseConfig = {
  ...fallbackConfig,
  ...Object.fromEntries(
    Object.entries(envConfig).filter(([, value]) => Boolean(value))
  ),
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const database = getDatabase(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

if (import.meta.env.DEV) {
  console.log("[Firebase] projectId:", firebaseConfig.projectId);
}

export { app, database, firestore, storage };
