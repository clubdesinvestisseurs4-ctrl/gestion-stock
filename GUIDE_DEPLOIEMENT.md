# Guide de déploiement — Gestion des Stocks

## Architecture

```
Frontend (Vue 3 PWA) ──► Vercel
Backend (Node.js/Express) ──► Render
Base de données ──► Firebase Firestore
Authentification ──► Firebase Auth
```

---

## ÉTAPE 1 — Créer le projet Firebase

1. Aller sur https://console.firebase.google.com
2. Cliquer **Créer un projet** → Nom : `gestion-stock`
3. Désactiver Google Analytics (optionnel) → **Créer**

### 1a. Activer Firebase Auth

1. Menu gauche → **Authentication** → **Commencer**
2. Onglet **Sign-in method** → Activer **Email/Mot de passe**

### 1b. Activer Firestore

1. Menu gauche → **Firestore Database** → **Créer une base de données**
2. Choisir **Mode production** → Région : `europe-west` (ou la plus proche)
3. Copier ces règles de sécurité dans l'onglet **Règles** :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Seul le backend (Admin SDK) accède directement à Firestore
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

> Le backend utilise le SDK Admin qui contourne les règles — c'est correct.

### 1c. Créer le compte de service (pour le backend)

1. Menu gauche → icône ⚙️ **Paramètres du projet** → onglet **Comptes de service**
2. Cliquer **Générer une nouvelle clé privée** → télécharger le fichier JSON
3. Extraire ces valeurs pour les variables d'environnement du backend :
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key_id` → `FIREBASE_PRIVATE_KEY_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `client_id` → `FIREBASE_CLIENT_ID`

### 1d. Enregistrer l'app Web (pour le frontend)

1. **Paramètres du projet** → onglet **Général** → section **Vos applications**
2. Cliquer l'icône `</>` → Nom : `gestion-stock-frontend`
3. Copier la configuration `firebaseConfig` — ce sont les variables `VITE_*`

### 1e. Créer le premier admin dans Firebase Auth

1. **Authentication** → **Utilisateurs** → **Ajouter un utilisateur**
2. Email : votre email, mot de passe fort
3. Ce compte sera votre premier Admin — vous lui attribuerez le rôle via Firestore après le premier déploiement

---

## ÉTAPE 2 — Déployer le backend sur Render

1. Pousser le code sur GitHub (repo public ou privé)
2. Aller sur https://render.com → **New Web Service**
3. Connecter votre repo GitHub
4. Configuration :
   - **Root Directory** : `backend`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Environment** : `Node`
   - **Plan** : Free (suffisant pour démarrer)

### Variables d'environnement à ajouter sur Render

```
PORT=3001
NODE_ENV=production
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FRONTEND_URL=https://your-frontend.vercel.app
```

> ⚠️ Pour `FIREBASE_PRIVATE_KEY` : coller la clé complète avec les `\n` littéraux (Render les interprétera correctement).

5. Cliquer **Create Web Service** → attendre le déploiement
6. Copier l'URL du service (ex: `https://gestion-stock-api.onrender.com`)

---

## ÉTAPE 3 — Déployer le frontend sur Vercel

1. Aller sur https://vercel.com → **Add New Project**
2. Importer votre repo GitHub
3. Configuration :
   - **Root Directory** : `frontend`
   - **Framework Preset** : Vite
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`

### Variables d'environnement à ajouter sur Vercel

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_BASE_URL=https://gestion-stock-api.onrender.com/api
```

4. Cliquer **Deploy** → attendre le déploiement
5. Copier l'URL Vercel (ex: `https://gestion-stock.vercel.app`)

### Mettre à jour FRONTEND_URL sur Render

Retourner sur Render → votre service → **Environment** → mettre à jour `FRONTEND_URL` avec l'URL Vercel exacte → **Save Changes**

---

## ÉTAPE 4 — Initialiser le premier utilisateur Admin

Après le déploiement, ouvrir **Firebase Console → Firestore** et créer manuellement ce document :

**Collection** : `users`
**Document ID** : UID de l'utilisateur créé à l'étape 1e (visible dans Authentication → Utilisateurs)

```json
{
  "email": "votre@email.com",
  "displayName": "Admin",
  "role": "admin",
  "establishmentId": null,
  "createdAt": "2026-06-16T00:00:00.000Z"
}
```

Vous pouvez ensuite vous connecter et créer d'autres utilisateurs depuis l'interface.

---

## ÉTAPE 5 — Initialiser les établissements dans Firestore

Créer les deux documents de base (Firestore crée automatiquement les sous-collections au premier produit ajouté, mais vous pouvez créer les documents parents) :

**Collection** : `establishments`

Document `cookafrica` :
```json
{ "name": "CookAfrica", "type": "restaurant" }
```

Document `ohinene` :
```json
{ "name": "Hôtel Ohinéné", "type": "hotel" }
```

---

## Développement local

### Backend
```bash
cd backend
cp .env.example .env
# Remplir .env avec vos valeurs Firebase
npm install
npm run dev
# Démarre sur http://localhost:3001
```

### Frontend
```bash
cd frontend
cp .env.example .env
# Remplir .env avec vos valeurs Firebase + URL backend
npm install
npm run dev
# Démarre sur http://localhost:5173
```

---

## Structure Firestore

```
establishments/
  cookafrica/
    products/
      {productId}/    name, category, unit, quantity, minThreshold, isLowStock, ...
    movements/
      {movementId}/   productId, type, quantity, quantityBefore, quantityAfter, ...
  ohinene/
    products/ ...
    movements/ ...

users/
  {uid}/              email, displayName, role, establishmentId, createdAt
```

---

## Vérification du déploiement

```bash
# Tester le backend (remplacer l'URL par la vôtre)
curl https://gestion-stock-api.onrender.com/api/health

# Réponse attendue :
# {"status":"ok","timestamp":"2026-06-16T..."}
```

---

## Notes importantes

- **Plan gratuit Render** : le service s'endort après 15 min d'inactivité. Premier chargement = ~30s. Passer au plan payant ($7/mois) pour éliminer ce délai.
- **PWA offline** : les pages déjà visitées fonctionnent hors ligne. Les écritures nécessitent une connexion (pas de sync offline implémentée).
- **Icônes PWA** : générer `icon-192.png` et `icon-512.png` et les placer dans `frontend/public/icons/`. Outil gratuit : https://realfavicongenerator.net
