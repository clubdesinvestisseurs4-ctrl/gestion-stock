const { getAuth, getDb } = require('../config/firebase');

// POST /api/init — Premier démarrage uniquement, sans auth préalable
async function initSystem(req, res) {
  try {
    const db = getDb();

    // Bloquer si un admin existe déjà
    const existing = await db.collection('users').where('role', '==', 'admin').limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Système déjà initialisé. Connectez-vous normalement.' });
    }

    // Vérifier le token Firebase pour identifier l'utilisateur
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }
    const decoded = await getAuth().verifyIdToken(header.split(' ')[1]);

    const batch = db.batch();

    // Créer le document admin dans Firestore
    batch.set(db.collection('users').doc(decoded.uid), {
      email: decoded.email || '',
      displayName: decoded.name || 'Admin',
      role: 'admin',
      establishmentId: null,
      createdAt: new Date().toISOString(),
    });

    // Créer les documents racine des établissements
    batch.set(db.collection('establishments').doc('cookafrica'),
      { name: 'CookAfrica', type: 'restaurant' }, { merge: true });
    batch.set(db.collection('establishments').doc('ohinene'),
      { name: 'Hôtel Ohinéné', type: 'hotel' }, { merge: true });

    await batch.commit();

    res.json({
      message: 'Système initialisé avec succès',
      user: { uid: decoded.uid, email: decoded.email, role: 'admin' },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/me — Vérifie si l'utilisateur courant est initialisé
async function getMe(req, res) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }
    const decoded = await getAuth().verifyIdToken(header.split(' ')[1]);
    const userDoc = await getDb().collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      // Vérifier si le système est déjà initialisé par quelqu'un d'autre
      const adminSnap = await getDb().collection('users').where('role', '==', 'admin').limit(1).get();
      return res.status(403).json({
        error: 'Utilisateur non enregistré',
        needsInit: adminSnap.empty,
      });
    }

    res.json({ uid: decoded.uid, ...userDoc.data() });
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' });
  }
}

module.exports = { initSystem, getMe };
