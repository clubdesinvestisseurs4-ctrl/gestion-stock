const { getDb } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

// GET /api/establishments/:establishmentId/products
async function listProducts(req, res) {
  try {
    const { establishmentId } = req.params;
    const snap = await getDb()
      .collection('establishments').doc(establishmentId)
      .collection('products')
      .orderBy('name')
      .get();

    const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/establishments/:establishmentId/products
async function createProduct(req, res) {
  try {
    const { establishmentId } = req.params;
    const { name, category, unit, quantity, minThreshold } = req.body;

    const ref = getDb()
      .collection('establishments').doc(establishmentId)
      .collection('products').doc(uuidv4());

    const product = {
      name,
      category: category || 'Général',
      unit,
      quantity,
      minThreshold,
      isLowStock: quantity <= minThreshold,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.uid,
    };

    await ref.set(product);
    res.status(201).json({ id: ref.id, ...product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/establishments/:establishmentId/products/:productId
async function updateProduct(req, res) {
  try {
    const { establishmentId, productId } = req.params;
    const { name, category, unit, minThreshold } = req.body;

    const ref = getDb()
      .collection('establishments').doc(establishmentId)
      .collection('products').doc(productId);

    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Produit introuvable' });

    const updates = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name;
    if (category) updates.category = category;
    if (unit) updates.unit = unit;
    if (minThreshold != null) {
      updates.minThreshold = minThreshold;
      updates.isLowStock = doc.data().quantity <= minThreshold;
    }

    await ref.update(updates);
    res.json({ id: productId, ...doc.data(), ...updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/establishments/:establishmentId/products/:productId
async function deleteProduct(req, res) {
  try {
    const { establishmentId, productId } = req.params;
    const ref = getDb()
      .collection('establishments').doc(establishmentId)
      .collection('products').doc(productId);

    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Produit introuvable' });

    await ref.delete();
    res.json({ message: 'Produit supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listProducts, createProduct, updateProduct, deleteProduct };
