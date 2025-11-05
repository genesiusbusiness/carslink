# 🚀 Guide Visuel : Déploiement AWS Amplify via GitHub

## 📦 ÉTAPE 1 : Initialiser Git et GitHub

### 1.1. Initialiser le dépôt Git (si pas déjà fait)

Ouvrez un terminal dans le dossier CarsLink et exécutez :

```bash
cd "/Users/taytonaday/Desktop/Workplace Flynesis All/CarsLinkApp/CarsLink"

# Initialiser Git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit - Configuration AWS Amplify"
```

### 1.2. Créer un dépôt sur GitHub

1. **Allez sur GitHub** : https://github.com/new
2. **Créez un nouveau dépôt** :
   - Nom : `carslink` (ou ce que vous voulez)
   - Description : "CarsLink Application"
   - Visibilité : Public ou Private (votre choix)
   - **NE PAS** cocher "Initialize with README"
   - Cliquez sur **"Create repository"**

### 1.3. Connecter le dépôt local à GitHub

GitHub vous donnera des commandes. Utilisez celles-ci (remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub) :

```bash
# Ajouter le remote GitHub
git remote add origin https://github.com/VOTRE_USERNAME/carslink.git

# Renommer la branche en main si nécessaire
git branch -M main

# Pousser vers GitHub
git push -u origin main
```

---

## ☁️ ÉTAPE 2 : Configurer AWS Amplify

### 2.1. Se connecter à AWS Amplify

1. **Allez sur** : https://console.aws.amazon.com/amplify/
2. **Connectez-vous** avec votre compte AWS
3. Si c'est votre première fois, suivez le guide de démarrage

### 2.2. Créer une nouvelle application

1. **Cliquez sur "New app"** (en haut à droite)
2. **Sélectionnez "Host web app"**

Vous verrez cette interface :
```
┌─────────────────────────────────────────┐
│  Connect a repository                  │
│                                         │
│  [ ] GitHub                            │
│  [ ] GitLab                            │
│  [ ] Bitbucket                         │
│  [ ] AWS CodeCommit                    │
│                                         │
│         [Cancel]  [Continue]           │
└─────────────────────────────────────────┘
```

3. **Cochez "GitHub"** puis cliquez sur **"Continue"**

### 2.3. Autoriser GitHub

1. **Autorisez AWS Amplify** à accéder à votre compte GitHub
2. Si demandé, sélectionnez **"Only select repositories"** et choisissez `carslink`
3. Cliquez sur **"Install & Authorize"**

### 2.4. Sélectionner le dépôt

Vous verrez la liste de vos dépôts GitHub :

```
┌─────────────────────────────────────────┐
│  Select a repository                   │
│                                         │
│  🔍 Search repositories...              │
│                                         │
│  ✅ carslink                           │
│    Branch: main                         │
│                                         │
│         [Cancel]  [Next]                │
└─────────────────────────────────────────┘
```

1. **Sélectionnez votre dépôt** `carslink`
2. **Vérifiez la branche** : `main` (ou `master`)
3. Cliquez sur **"Next"**

### 2.5. Configurer le build

AWS Amplify devrait détecter automatiquement Next.js :

```
┌─────────────────────────────────────────┐
│  Configure build settings               │
│                                         │
│  App name: carslink                    │
│                                         │
│  Build settings:                       │
│  [amplify.yml] (détecté automatiquement)│
│                                         │
│  Environment variables:                 │
│  (Optionnel - vide pour l'instant)     │
│                                         │
│         [Previous]  [Save and deploy]   │
└─────────────────────────────────────────┘
```

1. **Vérifiez le nom de l'app** : `carslink`
2. **Vérifiez que `amplify.yml` est détecté**
3. **Cliquez sur "Save and deploy"**

### 2.6. Attendre le build

Vous verrez l'écran de build en temps réel :

```
┌─────────────────────────────────────────┐
│  Deployment #1                          │
│                                         │
│  ⏳ Provisioning...                     │
│  ⏳ Building...                         │
│  ⏳ Deploying...                        │
│                                         │
│  [Voir les logs]                        │
└─────────────────────────────────────────┘
```

⏱️ **Cela prend généralement 5-10 minutes**

---

## ✅ ÉTAPE 3 : Configurer les Rewrites (IMPORTANT!)

### 3.1. Une fois le déploiement terminé

1. Dans la console Amplify, allez dans **"App settings"** (menu de gauche)
2. Cliquez sur **"Rewrites and redirects"**

### 3.2. Ajouter la règle de rewrite

Vous verrez un tableau vide ou avec quelques règles par défaut. Cliquez sur **"Add rewrite/redirect"** :

```
┌─────────────────────────────────────────┐
│  Add rewrite/redirect                   │
│                                         │
│  Source address:  /<*>                  │
│  Target address:  /index.html           │
│  Type:            [200 (Rewrite) ▼]     │
│  Country code:   (vide)                │
│                                         │
│         [Cancel]  [Save]                │
└─────────────────────────────────────────┘
```

Remplissez comme suit :
- **Source address** : `/<*>`
- **Target address** : `/index.html`
- **Type** : `200 (Rewrite)`
- Cliquez sur **"Save"**

### 3.3. Vérifier

Vous devriez voir votre règle dans la liste :

```
┌─────────────────────────────────────────┐
│  Rewrites and redirects                 │
│                                         │
│  Source          Target         Type   │
│  /<*>            /index.html    200    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎉 ÉTAPE 4 : Tester votre application

### 4.1. Obtenir l'URL

Une fois le déploiement terminé, vous verrez :

```
┌─────────────────────────────────────────┐
│  Deployment successful! ✅               │
│                                         │
│  Your app is live at:                   │
│  https://main.xxxxxxxxx.amplifyapp.com │
│                                         │
│  [Open app]                            │
└─────────────────────────────────────────┘
```

### 4.2. Tester

1. **Cliquez sur l'URL** ou copiez-la dans votre navigateur
2. **Testez les routes** :
   - `/` - Page d'accueil
   - `/login` - Page de connexion
   - `/appointments` - Page des rendez-vous
   - etc.

---

## 🔄 Déploiements Automatiques

Désormais, **à chaque fois que vous poussez du code sur GitHub**, Amplify redéploiera automatiquement :

```bash
# Après avoir modifié votre code
git add .
git commit -m "Mes modifications"
git push origin main

# Amplify détectera automatiquement le push et redéploiera!
```

Vous pouvez voir les déploiements dans l'onglet **"Deployments"** de la console Amplify.

---

## 📋 Checklist de Déploiement

Utilisez cette checklist pour vérifier que tout est en place :

- [ ] Git initialisé localement
- [ ] Dépôt GitHub créé
- [ ] Code pushé sur GitHub
- [ ] AWS Amplify connecté à GitHub
- [ ] Application créée dans Amplify
- [ ] Build réussi (vérifier les logs)
- [ ] Rewrites configurés (`/<*>` → `/index.html`)
- [ ] Application accessible via l'URL Amplify
- [ ] Routes Next.js fonctionnent correctement

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :

1. **Vérifiez les logs de build** dans Amplify Console > Deployments > [Votre déploiement]
2. **Vérifiez que `amplify.yml` est présent** dans votre dépôt GitHub
3. **Vérifiez que les rewrites sont configurés** (étape 3)

---

## 📸 Commandes Rapides

Voici toutes les commandes en une seule fois :

```bash
# 1. Aller dans le dossier
cd "/Users/taytonaday/Desktop/Workplace Flynesis All/CarsLinkApp/CarsLink"

# 2. Initialiser Git (si pas déjà fait)
git init

# 3. Ajouter tous les fichiers
git add .

# 4. Premier commit
git commit -m "Configuration AWS Amplify"

# 5. Ajouter le remote GitHub (remplacez VOTRE_USERNAME)
git remote add origin https://github.com/VOTRE_USERNAME/carslink.git

# 6. Renommer la branche
git branch -M main

# 7. Pousser vers GitHub
git push -u origin main

# ✅ Ensuite, suivez les étapes 2 à 4 dans AWS Amplify Console!
```

---

**Bon déploiement! 🚀**

