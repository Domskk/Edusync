import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  Messaging,
  MessagePayload,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app: FirebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const messaging: Messaging | null =
  typeof window !== "undefined" && (await isSupported()) ? getMessaging(app) : null;

// Request token
export const requestFCMToken = async (): Promise<string | null> => {
  if (!messaging) return null;

  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
    });

    if (token) {
      await fetch("/api/notifications/token", {
        method: "POST",
        body: JSON.stringify({ token }),
        headers: { "Content-Type": "application/json" },
      });
      console.log("FCM token registered");
      return token;
    }
  } catch (err) {
    console.warn("FCM token error (permission denied or blocked)", err);
  }
  return null;
};

// Foreground message listener – fully typed
export const onForegroundMessage = (
  callback: (payload: MessagePayload) => void
) => {
  if (!messaging) return;

  onMessage(messaging, (payload: MessagePayload) => {
    console.log("Message received (foreground):", payload);
    callback(payload);
  });
};