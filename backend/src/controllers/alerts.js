const { getDb } = require('../config/firebase');

// GET /api/establishments/:establishmentId/alerts
async function listAlerts(req, res) {
  try {
    const { establishmentId } = req.params;
    const snap = await getDb()
      .collection('establishments').doc(establishmentId)
      .collection('products')
      .where('isLowStock', '==', true)
      .orderBy('name')
      .get();

    const alerts = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name,
        category: d.category,
        quantity: d.quantity,
        minThreshold: d.minThreshold,
        unit: d.unit,
        deficit: d.minThreshold - d.quantity,
        updatedAt: d.updatedAt,
      };
    });

    res.json({ count: alerts.length, alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/establishments/:establishmentId/dashboard
async function getDashboard(req, res) {
  try {
    const { establishmentId } = req.params;
    const db = getDb();
    const basePath = db.collection('establishments').doc(establishmentId);

    const [productsSnap, lowStockSnap, movementsSnap] = await Promise.all([
      basePath.collection('products').get(),
      basePath.collection('products').where('isLowStock', '==', true).get(),
      basePath.collection('movements')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get(),
    ]);

    const categories = {};
    productsSnap.docs.forEach(doc => {
      const d = doc.data();
      categories[d.category] = (categories[d.category] || 0) + 1;
    });

    res.json({
      totalProducts: productsSnap.size,
      lowStockCount: lowStockSnap.size,
      categories: Object.entries(categories).map(([name, count]) => ({ name, count })),
      recentMovements: movementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listAlerts, getDashboard };
