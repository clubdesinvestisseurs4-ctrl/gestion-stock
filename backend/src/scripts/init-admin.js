/**
 * Script d'initialisation : crée le document Firestore pour le premier admin.
 * Usage : node src/scripts/init-admin.js <uid> <email>
 * L'UID se trouve dans Firebase Console > Authentication > Utilisateurs
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { initFirebase, getDb } = require('../config/firebase');

const [,, uid, email] = process.argv;

if (!uid || !email) {
  console.error('Usage: node src/scripts/init-admin.js <uid> <email>');
  process.exit(1);
}

async function run() {
  initFirebase();
  const db = getDb();

  await db.collection('users').doc(uid).set({
    email,
    displayName: 'Admin',
    role: 'admin',
    establishmentId: null,
    createdAt: new Date().toISOString(),
  });

  // Créer aussi les documents de base des établissements
  await db.collection('establishments').doc('cookafrica').set({ name: 'CookAfrica', type: 'restaurant' }, { merge: true });
  await db.collection('establishments').doc('ohinene').set({ name: 'Hôtel Ohinéné', type: 'hotel' }, { merge: true });

  console.log(`✅ Admin créé: ${email} (uid: ${uid})`);
  console.log('✅ Établissements initialisés: cookafrica, ohinene');
  process.exit(0);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
