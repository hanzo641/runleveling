# RunLeveling Backend API

Backend FastAPI pour l'application mobile RunLeveling, prêt pour Railway.

## 🚀 Déploiement sur Railway

### 1. Créer un nouveau projet Railway

1. Va sur [railway.app](https://railway.app)
2. Clique sur "New Project"
3. Choisis "Deploy from GitHub repo"
4. Connecte ton repo GitHub contenant ce dossier `railway-backend`

### 2. Ajouter une base de données MongoDB

1. Dans ton projet Railway, clique sur "Add New Service"
2. Choisis "Database" → "MongoDB"
3. Railway créera automatiquement la variable `MONGO_URL`

### 3. Variables d'environnement

Railway définit automatiquement :
- `PORT` - Port d'écoute (géré par Railway)
- `MONGO_URL` ou `MONGODB_URL` - URL de connexion MongoDB

Variables optionnelles (Strava) :
- `STRAVA_CLIENT_ID` - ID client Strava API
- `STRAVA_CLIENT_SECRET` - Secret client Strava API

### 4. Déploiement

Le déploiement est automatique à chaque push sur GitHub.

Railway détecte automatiquement :
- Le `Procfile` pour la commande de démarrage
- Le `requirements.txt` pour les dépendances Python

## 📡 Endpoints API

### Health Checks
- `GET /` - Retourne status OK
- `GET /health` - Retourne `{"status": "ok"}`
- `GET /api` - Liste des endpoints disponibles

### User Progress
- `GET /api/progress/{device_id}` - Récupère la progression utilisateur

### Sessions
- `POST /api/session/complete` - Termine une session de course
- `GET /api/sessions/{device_id}` - Historique des sessions

### Quests
- `POST /api/quests/claim` - Réclame une récompense de quête

### Trophies
- `GET /api/trophies/{device_id}` - Liste des trophées

### Leaderboard
- `GET /api/leaderboard` - Classement global

### User Settings
- `PUT /api/username` - Définir le pseudo (une seule fois)
- `PUT /api/notifications` - Paramètres de notifications

### Strava Integration
- `GET /api/strava/status/{device_id}` - Statut connexion Strava
- `POST /api/strava/connect` - Connecter Strava
- `POST /api/strava/disconnect` - Déconnecter Strava
- `POST /api/strava/sync` - Synchroniser les activités

## 🔧 Développement local

```bash
# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

## 📱 Configuration Expo

Dans ton app Expo, configure l'URL du backend :

```javascript
// .env ou constante
const BACKEND_URL = "https://ton-projet.up.railway.app";

// Appel API exemple
const response = await fetch(`${BACKEND_URL}/api/progress/${deviceId}`);
```

## ✅ Checklist Déploiement

- [ ] Repo GitHub avec ce dossier
- [ ] Projet Railway créé
- [ ] MongoDB ajouté sur Railway
- [ ] Variables Strava configurées (optionnel)
- [ ] URL Railway récupérée pour l'app Expo
- [ ] Tester `/health` retourne 200 OK

## 📄 Structure

```
railway-backend/
├── server.py         # Application FastAPI principale
├── requirements.txt  # Dépendances Python
├── Procfile          # Commande de démarrage Railway
└── README.md         # Ce fichier
```
