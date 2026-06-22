const admin = require('firebase-admin');
const { getDb } = require('../config/firebase');

// POST /api/me/fcm-token
async function saveFcmToken(req, res) {
  try {
    const { token } = req.body;

    await getDb()
      .collection('users').doc(req.user.uid)
      .collection('fcmTokens').doc(token)
      .set({ createdAt: new Date().toISOString(), userAgent: req.headers['user-agent'] || '' }, { merge: true });

    res.status(201).json({ message: 'Token enregistré' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/me/fcm-token
async function deleteFcmToken(req, res) {
  try {
    const { token } = req.body;

    await getDb()
      .collection('users').doc(req.user.uid)
      .collection('fcmTokens').doc(token)
      .delete();

    res.json({ message: 'Token supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Notifie les admins + les opérateurs de l'établissement qu'un produit vient de passer en stock bas.
// Fire-and-forget côté appelant : ne doit jamais lever d'exception.
async function notifyLowStock({ establishmentId, product, newQuantity }) {
  try {
    const db = getDb();
    const [adminsSnap, operatorsSnap] = await Promise.all([
      db.collection('users').where('role', '==', 'admin').get(),
      db.collection('users').where('establishmentId', '==', establishmentId).get(),
    ]);

    const recipients = new Map();
    [...adminsSnap.docs, ...operatorsSnap.docs].forEach(doc => recipients.set(doc.id, doc));
    if (recipients.size === 0) return;

    const tokenDocsByUid = await Promise.all(
      [...recipients.keys()].map(uid => db.collection('users').doc(uid).collection('fcmTokens').get())
    );
    const tokenOwners = tokenDocsByUid.flatMap((snap, idx) =>
      snap.docs.map(doc => ({ token: doc.id, uid: [...recipients.keys()][idx] }))
    );
    if (tokenOwners.length === 0) return;

    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokenOwners.map(t => t.token),
      notification: {
        title: `⚠️ Stock bas : ${product.name}`,
        body: `${newQuantity} ${product.unit} restant(s) — seuil ${product.minThreshold} ${product.unit}`,
      },
      data: { establishmentId, productId: product.id, url: '/alerts' },
    });

    const staleOwners = response.responses
      .map((r, i) => ({ r, owner: tokenOwners[i] }))
      .filter(({ r }) => r.error && ['messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(r.error.code))
      .map(({ owner }) => owner);

    if (staleOwners.length > 0) {
      const cleanup = db.batch();
      staleOwners.forEach(({ uid, token }) =>
        cleanup.delete(db.collection('users').doc(uid).collection('fcmTokens').doc(token))
      );
      await cleanup.commit();
    }
  } catch (err) {
    console.error('notifyLowStock a échoué:', err.message);
  }
}

module.exports = { saveFcmToken, deleteFcmToken, notifyLowStock };
