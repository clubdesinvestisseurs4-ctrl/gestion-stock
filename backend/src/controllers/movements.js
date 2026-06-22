const { getDb } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const { notifyLowStock } = require('./notifications');

// GET /api/establishments/:establishmentId/movements
async function listMovements(req, res) {
  try {
    const { establishmentId } = req.params;
    const { productId, type, limit = 50, startDate, endDate } = req.query;

    let query = getDb()
      .collection('establishments').doc(establishmentId)
      .collection('movements')
      .orderBy('createdAt', 'desc');

    // Filtre plage de dates (ISO string comparables lexicographiquement)
    if (startDate) query = query.where('createdAt', '>=', startDate);
    if (endDate)   query = query.where('createdAt', '<=', endDate);

    // Filtre productId uniquement si pas de filtre date (évite index composé manquant)
    if (productId && !startDate && !endDate) query = query.where('productId', '==', productId);
    if (type && !startDate && !endDate)      query = query.where('type', '==', type);

    query = query.limit(startDate || endDate ? 500 : Number(limit));

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

    const db = getDb();
    const productRef = db
      .collection('establishments').doc(establishmentId)
      .collection('products').doc(productId);

    const productDoc = await productRef.get();
    if (!productDoc.exists) return res.status(404).json({ error: 'Produit introuvable' });

    const product = productDoc.data();
    const delta = type === 'entree' ? quantity : -quantity;
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
      quantity,
      quantityBefore: product.quantity,
      quantityAfter: newQuantity,
      unit: product.unit,
      note: note || '',
      triggeredAlert: isLowStock,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid,
      createdByName: req.user.displayName || req.user.email || '',
    });

    await batch.commit();

    // Notification push uniquement sur le front montant (évite de spammer à chaque
    // sortie suivante une fois déjà en stock bas). Fire-and-forget : ne doit jamais
    // retarder ni faire échouer la réponse de création de mouvement.
    if (isLowStock && !product.isLowStock) {
      notifyLowStock({ establishmentId, product: { id: productId, ...product }, newQuantity });
    }

    res.status(201).json({
      movement: { id: movementRef.id, productId, type, quantity },
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
