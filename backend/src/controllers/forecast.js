const { getDb } = require('../config/firebase');

const DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/establishments/:establishmentId/forecast?windowDays&leadTimeDays&safetyDays
async function getForecast(req, res) {
  try {
    const { establishmentId } = req.params;
    const windowDays = Math.max(7, Math.min(180, Number(req.query.windowDays) || 30));
    const leadTimeDays = Math.max(0, Number(req.query.leadTimeDays) || 3);
    const safetyDays = Math.max(0, Number(req.query.safetyDays) || 2);

    const db = getDb();
    const basePath = db.collection('establishments').doc(establishmentId);

    const now = Date.now();
    const windowStart = new Date(now - windowDays * DAY_MS).toISOString();
    const midPoint = new Date(now - (windowDays / 2) * DAY_MS).toISOString();

    const [productsSnap, movementsSnap] = await Promise.all([
      basePath.collection('products').orderBy('name').get(),
      // Filtre uniquement sur createdAt (index simple) ; le type "sortie" est
      // filtré en mémoire ci-dessous pour éviter un index composé manquant.
      basePath.collection('movements')
        .orderBy('createdAt', 'desc')
        .where('createdAt', '>=', windowStart)
        .limit(5000)
        .get(),
    ]);

    const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sorties par produit, scindées en 2 moitiés de fenêtre (récente / ancienne)
    const stats = {};
    movementsSnap.docs.forEach(doc => {
      const m = doc.data();
      if (m.type !== 'sortie') return;
      const s = stats[m.productId] || (stats[m.productId] = { recentOut: 0, olderOut: 0, totalOut: 0 });
      s.totalOut += m.quantity;
      if (m.createdAt >= midPoint) s.recentOut += m.quantity;
      else s.olderOut += m.quantity;
    });

    const halfDays = windowDays / 2;

    const items = products.map(p => {
      const s = stats[p.id] || { recentOut: 0, olderOut: 0, totalOut: 0 };
      const recentAvg = s.recentOut / halfDays;
      const olderAvg = s.olderOut / halfDays;
      // Moyenne pondérée récente : réagit plus vite à un changement de rythme récent
      const dailyRate = recentAvg * 0.6 + olderAvg * 0.4;

      let trendPct = null;
      if (olderAvg > 0) trendPct = +(((recentAvg - olderAvg) / olderAvg) * 100).toFixed(1);
      else if (recentAvg > 0) trendPct = 100;

      const daysUntilStockout = dailyRate > 0 ? +(p.quantity / dailyRate).toFixed(1) : null;

      const coverNeeded = dailyRate * (leadTimeDays + safetyDays);
      const deficitVsThreshold = p.quantity <= p.minThreshold ? p.minThreshold - p.quantity : 0;
      const suggestedReorderQty = Math.max(0, Math.ceil(coverNeeded - p.quantity), Math.ceil(deficitVsThreshold));

      let urgency = 'inactive';
      if (dailyRate > 0) {
        if (daysUntilStockout <= leadTimeDays) urgency = 'critical';
        else if (daysUntilStockout <= leadTimeDays + safetyDays) urgency = 'warning';
        else urgency = 'ok';
      } else if (p.isLowStock) {
        urgency = 'warning';
      }

      return {
        productId: p.id,
        productName: p.name,
        category: p.category,
        unit: p.unit,
        currentQuantity: p.quantity,
        minThreshold: p.minThreshold,
        totalOut: +s.totalOut.toFixed(3),
        dailyRate: +dailyRate.toFixed(3),
        trendPct,
        daysUntilStockout,
        suggestedReorderQty,
        urgency,
      };
    });

    // Classement ABC (Pareto) sur le volume sorti : répond à "ce qui sort le plus"
    const totalOutAll = items.reduce((sum, i) => sum + i.totalOut, 0);
    const ranked = [...items].sort((a, b) => b.totalOut - a.totalOut);
    const abcByProduct = {};
    const cumPctByProduct = {};
    let cumulative = 0;
    ranked.forEach(i => {
      if (i.totalOut === 0) { abcByProduct[i.productId] = null; cumPctByProduct[i.productId] = null; return; }
      cumulative += i.totalOut;
      const cumPct = totalOutAll > 0 ? cumulative / totalOutAll : 0;
      abcByProduct[i.productId] = cumPct <= 0.8 ? 'A' : cumPct <= 0.95 ? 'B' : 'C';
      cumPctByProduct[i.productId] = +(cumPct * 100).toFixed(1);
    });

    const urgencyOrder = { critical: 0, warning: 1, ok: 2, inactive: 3 };
    const fullItems = items
      .map(i => ({ ...i, abcClass: abcByProduct[i.productId] }))
      .sort((a, b) =>
        urgencyOrder[a.urgency] - urgencyOrder[b.urgency] ||
        (a.daysUntilStockout ?? Infinity) - (b.daysUntilStockout ?? Infinity)
      );

    const topMovers = ranked.filter(i => i.totalOut > 0).slice(0, 8).map(i => ({
      productId: i.productId,
      productName: i.productName,
      unit: i.unit,
      totalOut: i.totalOut,
      abcClass: abcByProduct[i.productId],
      cumulativePct: cumPctByProduct[i.productId],
    }));

    res.json({
      windowDays,
      leadTimeDays,
      safetyDays,
      generatedAt: new Date().toISOString(),
      items: fullItems,
      topMovers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getForecast };
