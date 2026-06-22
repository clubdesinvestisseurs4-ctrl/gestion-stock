const { getAuth, getDb } = require('../config/firebase');

// POST /api/users (admin uniquement)
async function createUser(req, res) {
  try {
    const { email, password, displayName, role, establishmentId } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Champs requis: email, password, role' });
    }
    if (!['admin', 'operator'].includes(role)) {
      return res.status(400).json({ error: 'role doit être "admin" ou "operator"' });
    }
    if (role === 'operator' && !establishmentId) {
      return res.status(400).json({ error: 'establishmentId requis pour un opérateur' });
    }

    const userRecord = await getAuth().createUser({ email, password, displayName });

    await getDb().collection('users').doc(userRecord.uid).set({
      email,
      displayName: displayName || '',
      role,
      establishmentId: role === 'admin' ? null : establishmentId,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid,
    });

    res.status(201).json({
      uid: userRecord.uid,
      email,
      displayName,
      role,
      establishmentId: role === 'admin' ? null : establishmentId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/users (admin uniquement)
async function listUsers(req, res) {
  try {
    const snap = await getDb().collection('users').orderBy('email').get();
    res.json(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/users/:uid (admin uniquement)
async function deleteUser(req, res) {
  try {
    const { uid } = req.params;
    if (uid === req.user.uid) {
      return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
    }
    await getAuth().deleteUser(uid);

    const userRef = getDb().collection('users').doc(uid);
    const tokensSnap = await userRef.collection('fcmTokens').get();
    const batch = getDb().batch();
    tokensSnap.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(userRef);
    await batch.commit();

    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createUser, listUsers, deleteUser };
