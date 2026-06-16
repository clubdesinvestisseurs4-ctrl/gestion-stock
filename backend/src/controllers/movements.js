const { getDb } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

// GET /api/establishments/:establishmentId/movements
async function listMovements(req, res) {
  try {
    const { establishmentId } = req.params;
    const { productId, type, limit = 50 } = req.query;

    let query = getDb()
      .collection('establishments').doc(establishmentId)
      .collection('movements')
      .orderBy('createdAt', 'desc')
      .limit(Number(limit));

    if (productId) query = query.where('productId', '==', productId);
    if (type) query = query.where('type', '==', type);

    const snap = await query.get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/establishments/:establishmentId/movements
async function createMovement(req, res) {
  try {
    const { establishmentId } = req.params;
    const { productId, type, quantity, note } = req.body;

    if (!productId || !type || !quantity) {
      return res.status(400).json({ error: 'Champs requis: productId, type, quantity' });
    }
    if (!['entree', 'sortie'].includes(type)) {
      return res.status(400).json({ error: 'type doit être "entree" ou "sortie"' });
    }
    if (Number(quantity) <= 0) {
      return res.status(400).json({ error: 'La quantité doit être positive' });
    }

    const db = getDb();
    const productRef = db
      .collection('establishments').doc(establishmentId)
      .collection('products').doc(productId);

    const productDoc = await productRef.get();
    if (!productDoc.exists) return res.status(404).json({ error: 'Produit introuvable' });

    const product = productDoc.data();
    const delta = type === 'entree' ? Number(quantity) : -Number(quantity);
    const newQuantity = product.quantity + delta;

    if (newQuantity < 0) {
      return res.status(400).json({
        error: `Stock insuffisant. Disponible: ${product.quantity} ${product.unit}`,
      });
    }

    const isLowStock = newQuantity <= product.minThreshold;

    // Transaction atomique : mise à jour stock + création mouvement
    const movementRef = db
      .collection('establishments').doc(establishmentId)
      .collection('movements').doc(uuidv4());

    const batch = db.batch();
    batch.update(productRef, {
      quantity: newQuantity,
      isLowStock,
      updatedAt: new Date().toISOString(),
    });
    batch.set(movementRef, {
      productId,
      productName: product.name,
      type,
      quantity: Number(quantity),
      quantityBefore: product.quantity,
      quantityAfter: newQuantity,
      unit: product.unit,
      note: note?.trim() || '',
      triggeredAlert: isLowStock,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid,
      createdByName: req.user.displayName || req.user.email || '',
    });

    await batch.commit();

    res.status(201).json({
      movement: { id: movementRef.id, productId, type, quantity: Number(quantity) },
      stock: { productId, newQuantity, isLowStock, unit: product.unit },
      alert: isLowStock
        ? { message: `⚠️ Stock bas : ${product.name} (${newQuantity} ${product.unit})` }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listMovements, createMovement };
