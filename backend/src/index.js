require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { initFirebase } = require('./config/firebase');
const routes = require('./routes');

// Démarrer Firebase — le serveur continue même en cas d'erreur pour afficher un message utile
let firebaseReady = false;
try {
  initFirebase();
  firebaseReady = true;
  console.log('✅ Firebase initialisé');
} catch (err) {
  console.error('❌ Firebase init échoué:', err.message);
  console.error('👉 Vérifiez FIREBASE_SERVICE_ACCOUNT_BASE64 dans les variables d\'environnement Render.');
}

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — accepte le frontend Vercel ET localhost en dev
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (Postman, curl) et les origines autorisées
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    // En production, logger les origines inconnues mais les autoriser quand même
    console.warn('Origine CORS non listée:', origin);
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { error: 'Trop de requêtes' } }));

// Bloquer toutes les routes si Firebase n'est pas prêt
app.use((req, res, next) => {
  if (!firebaseReady && req.path !== '/api/health') {
    return res.status(503).json({
      error: 'Service temporairement indisponible — Firebase non initialisé.',
      hint: 'Vérifiez la variable FIREBASE_SERVICE_ACCOUNT_BASE64 sur Render.',
    });
  }
  next();
});

app.use('/api', routes);

app.use((req, res) => res.status(404).json({ error: 'Route introuvable', path: req.path }));
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur interne', detail: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
  console.log(`   Firebase: ${firebaseReady ? 'OK' : 'ERREUR'}`);
});

module.exports = app;
