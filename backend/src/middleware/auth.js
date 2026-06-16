const { getAuth, getDb } = require('../config/firebase');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = await getAuth().verifyIdToken(token);
    const userDoc = await getDb().collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: 'Utilisateur introuvable' });
    }
    req.user = { uid: decoded.uid, ...userDoc.data() };
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

function requireEstablishment(req, res, next) {
  const { establishmentId } = req.params;
  const user = req.user;
  // Admin peut accéder à tous les établissements
  if (user.role === 'admin') return next();
  // Opérateur limité à son établissement
  if (user.establishmentId !== establishmentId) {
    return res.status(403).json({ error: 'Accès refusé à cet établissement' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireEstablishment };
