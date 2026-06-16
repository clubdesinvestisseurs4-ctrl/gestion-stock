const admin = require('firebase-admin');

let db;

function initFirebase() {
  if (admin.apps.length > 0) return admin.app();

  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      clientId: process.env.FIREBASE_CLIENT_ID,
    }),
  });

  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });

  return app;
}

function getDb() {
  if (!db) initFirebase();
  return db;
}

function getAuth() {
  return admin.auth();
}

module.exports = { initFirebase, getDb, getAuth };
