const { Router } = require('express');
const { authenticate, requireAdmin, requireEstablishment } = require('../middleware/auth');
const { listProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/products');
const { listMovements, createMovement } = require('../controllers/movements');
const { listAlerts, getDashboard } = require('../controllers/alerts');
const { createUser, listUsers, deleteUser } = require('../controllers/users');

const router = Router();

// Health check
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes établissements (authentifiées)
const estPath = '/establishments/:establishmentId';

router.get(`${estPath}/dashboard`, authenticate, requireEstablishment, getDashboard);
router.get(`${estPath}/alerts`, authenticate, requireEstablishment, listAlerts);

router.get(`${estPath}/products`, authenticate, requireEstablishment, listProducts);
router.post(`${estPath}/products`, authenticate, requireEstablishment, createProduct);
router.put(`${estPath}/products/:productId`, authenticate, requireEstablishment, updateProduct);
router.delete(`${estPath}/products/:productId`, authenticate, requireAdmin, deleteProduct);

router.get(`${estPath}/movements`, authenticate, requireEstablishment, listMovements);
router.post(`${estPath}/movements`, authenticate, requireEstablishment, createMovement);

// Routes utilisateurs (admin uniquement)
router.get('/users', authenticate, requireAdmin, listUsers);
router.post('/users', authenticate, requireAdmin, createUser);
router.delete('/users/:uid', authenticate, requireAdmin, deleteUser);

module.exports = router;
