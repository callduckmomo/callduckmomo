import * as admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
  if (!projectId || !clientEmail || !privateKey) {
    // If not configured yet, throw helper error or allow fallback
    throw new Error("ไม่พบตัวแปรสภาพแวดล้อมสำหรับ Firebase Admin SDK ใน environment (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)");
  }

  const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: formattedPrivateKey,
    }),
  });
}

export const db = admin.firestore();
