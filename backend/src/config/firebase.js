const admin = require('firebase-admin');

let db;

function getServiceAccount() {
  // Méthode 1 (recommandée sur Render) : JSON encodé en Base64
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    return JSON.parse(json);
  }
  // Méthode 2 : variables individuelles (fallback local)
  const raw = process.env.FIREBASE_PRIVATE_KEY || '';
  // Gère les \n littéraux ET les vraies newlines selon le contexte
  const privateKey = raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
  };
}

function initFirebase() {
  if (admin.apps.length > 0) return admin.app();

  const app = admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
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
