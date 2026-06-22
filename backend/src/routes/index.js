const { Router } = require('express');
const { authenticate, requireAdmin, requireEstablishment } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { listProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/products');
const { listMovements, createMovement } = require('../controllers/movements');
const { listAlerts, getDashboard } = require('../controllers/alerts');
const { getForecast } = require('../controllers/forecast');
const { createUser, listUsers, deleteUser } = require('../controllers/users');
const { initSystem, getMe } = require('../controllers/init');
const { saveFcmToken, deleteFcmToken } = require('../controllers/notifications');
const { createProductSchema, updateProductSchema } = require('../schemas/products.schema');
const { createMovementSchema } = require('../schemas/movements.schema');
const { createUserSchema } = require('../schemas/users.schema');
const { fcmTokenSchema } = require('../schemas/notifications.schema');

const router = Router();

// Health check
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Initialisation premier démarrage (sans auth Firestore)
router.post('/init', initSystem);
router.get('/me', getMe);
router.post('/me/fcm-token', authenticate, validate(fcmTokenSchema), saveFcmToken);
router.delete('/me/fcm-token', authenticate, validate(fcmTokenSchema), deleteFcmToken);

// Routes établissements (authentifiées)
const estPath = '/establishments/:establishmentId';

router.get(`${estPath}/dashboard`, authenticate, requireEstablishment, getDashboard);
router.get(`${estPath}/alerts`, authenticate, requireEstablishment, listAlerts);
router.get(`${estPath}/forecast`, authenticate, requireEstablishment, getForecast);

router.get(`${estPath}/products`, authenticate, requireEstablishment, listProducts);
router.post(`${estPath}/products`, authenticate, requireEstablishment, validate(createProductSchema), createProduct);
router.put(`${estPath}/products/:productId`, authenticate, requireEstablishment, validate(updateProductSchema), updateProduct);
router.delete(`${estPath}/products/:productId`, authenticate, requireAdmin, deleteProduct);

router.get(`${estPath}/movements`, authenticate, requireEstablishment, listMovements);
router.post(`${estPath}/movements`, authenticate, requireEstablishment, validate(createMovementSchema), createMovement);

// Routes utilisateurs (admin uniquement)
router.get('/users', authenticate, requireAdmin, listUsers);
router.post('/users', authenticate, requireAdmin, validate(createUserSchema), createUser);
router.delete('/users/:uid', authenticate, requireAdmin, deleteUser);

module.exports = router;
