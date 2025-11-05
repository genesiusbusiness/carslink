# 🚀 Guide Déploiement Manuel AWS Amplify (Drag & Drop)

## ✅ Fichier ZIP créé !

Le fichier `carslink-deploy.zip` a été créé ici :
```
/Users/taytonaday/Desktop/Workplace Flynesis All/CarsLinkApp/carslink-deploy.zip
```

---

## 📦 ÉTAPE 1 : Aller sur AWS Amplify Console

1. **Ouvrez votre navigateur** et allez sur : **https://console.aws.amazon.com/amplify/**
2. **Connectez-vous** avec votre compte AWS

---

## 🆕 ÉTAPE 2 : Créer une nouvelle application

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
│  [ ] Deploy without Git Provider       │ ← CHOISISSEZ CELUI-CI
│                                         │
│         [Cancel]  [Continue]           │
└─────────────────────────────────────────┘
```

3. **Cochez "Deploy without Git Provider"**
4. **Cliquez sur "Continue"**

---

## 📤 ÉTAPE 3 : Télécharger le ZIP

Vous verrez cette page :

```
┌─────────────────────────────────────────┐
│  Deploy without Git Provider           │
│                                         │
│  App name:                             │
│  ┌─────────────────────────────────┐   │
│  │ carslink                         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Drag and drop your app files here,    │
│  or click to browse                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                  │   │
│  │    📁 Drag & Drop your ZIP      │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Supported formats: .zip               │
│                                         │
│         [Cancel]  [Save and deploy]     │
└─────────────────────────────────────────┘
```

1. **App name** : Tapez `carslink` (ou le nom de votre choix)
2. **Drag & Drop** : 
   - Ouvrez Finder
   - Allez dans : `/Users/taytonaday/Desktop/Workplace Flynesis All/CarsLinkApp/`
   - Trouvez le fichier `carslink-deploy.zip`
   - **Glissez-déposez** le fichier dans la zone de dépôt
   - OU cliquez sur la zone et sélectionnez le fichier

---

## ⚙️ ÉTAPE 4 : Configurer le Build

Une fois le ZIP téléchargé, AWS Amplify devrait détecter automatiquement Next.js.

Vérifiez que :
- ✅ **App name** : `carslink`
- ✅ **Build settings** : Le fichier `amplify.yml` devrait être détecté automatiquement
- ✅ **Framework** : Next.js devrait être détecté automatiquement

Si `amplify.yml` n'est pas détecté, vous pouvez le vérifier dans les paramètres avancés.

---

## 🚀 ÉTAPE 5 : Déployer

1. **Cliquez sur "Save and deploy"**
2. AWS Amplify va :
   - Extraire le ZIP
   - Installer les dépendances (`npm ci`)
   - Builder l'application (`npm run build`)
   - Déployer sur AWS

3. ⏱️ **Attendez la fin du build** (environ 5-10 minutes)

Vous verrez l'avancement en temps réel :

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

---

## ✅ ÉTAPE 6 : Configurer les Rewrites (IMPORTANT!)

Une fois le déploiement terminé :

1. Dans la console Amplify, allez dans **"App settings"** (menu de gauche)
2. Cliquez sur **"Rewrites and redirects"**
3. Cliquez sur **"Add rewrite/redirect"**
4. Configurez :
   - **Source address** : `/<*>`
   - **Target address** : `/index.html`
   - **Type** : `200 (Rewrite)`
5. Cliquez sur **"Save"**

---

## 🎉 ÉTAPE 7 : Tester votre application

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

1. **Cliquez sur l'URL** pour tester votre application
2. **Testez les routes** :
   - `/` - Page d'accueil
   - `/login` - Page de connexion
   - `/appointments` - Page des rendez-vous
   - etc.

---

## 🔄 Redéployer après modifications

Si vous modifiez votre code localement :

1. **Créez un nouveau ZIP** avec les mêmes commandes :
   ```bash
   cd "/Users/taytonaday/Desktop/Workplace Flynesis All/CarsLinkApp/CarsLink"
   zip -r ../carslink-deploy.zip . -x "*.git*" -x "*node_modules*" -x "*.next*" -x "*.DS_Store" -x "*tsconfig.tsbuildinfo"
   ```

2. **Dans AWS Amplify** :
   - Allez dans **"Deployments"**
   - Cliquez sur **"Trigger deployment"** > **"Deploy latest version"**
   - Téléchargez à nouveau le nouveau ZIP

---

## 📋 Checklist de Déploiement

- [ ] Fichier ZIP créé (`carslink-deploy.zip`)
- [ ] Compte AWS connecté
- [ ] Nouvelle app créée sur Amplify
- [ ] ZIP téléchargé via drag & drop
- [ ] Build réussi (vérifier les logs)
- [ ] Rewrites configurés (`/<*>` → `/index.html`)
- [ ] Application accessible via l'URL Amplify
- [ ] Routes Next.js fonctionnent correctement

---

## 🆘 Résolution de Problèmes

### Erreur 404 sur les routes

1. Vérifiez que les rewrites sont configurés (ÉTAPE 6)
2. Vérifiez les logs de build dans Amplify Console
3. Assurez-vous que le build réussit sans erreur

### Erreurs de build

1. Vérifiez les logs de build dans la console Amplify
2. Assurez-vous que `amplify.yml` est bien dans le ZIP
3. Vérifiez que `package.json` contient toutes les dépendances

### Le ZIP est trop volumineux

Si le ZIP dépasse la limite (généralement 500MB), vous pouvez exclure plus de fichiers :

```bash
zip -r ../carslink-deploy.zip . \
  -x "*.git*" \
  -x "*node_modules*" \
  -x "*.next*" \
  -x "*.DS_Store" \
  -x "*tsconfig.tsbuildinfo" \
  -x "*.log" \
  -x "*coverage*"
```

---

**Bon déploiement! 🚀**

