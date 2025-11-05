# 📸 Guide Visuel GitHub - Créer et Connecter le Dépôt

## ✅ ÉTAPE 1 : Votre code est prêt !

✅ Git a été initialisé
✅ Tous les fichiers ont été ajoutés
✅ Premier commit créé : "Initial commit - Configuration AWS Amplify"

---

## 🌐 ÉTAPE 2 : Créer le dépôt sur GitHub

### 2.1. Allez sur GitHub

1. **Ouvrez votre navigateur** et allez sur : **https://github.com/new**

   Ou allez sur **https://github.com** et cliquez sur le bouton **"+"** en haut à droite > **"New repository"**

### 2.2. Remplissez le formulaire

Vous verrez cette page :

```
┌─────────────────────────────────────────────────────────┐
│  Create a new repository                                 │
│                                                          │
│  Owner: [Votre nom d'utilisateur ▼]                     │
│                                                          │
│  Repository name *                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ carslink                                         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Description (optional)                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ CarsLink Application - Next.js                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ☐ Public                                               │
│  ☑ Private  (recommandé pour le code avec clés)         │
│                                                          │
│  ⚠️ IMPORTANT : NE COCHEZ PAS CES OPTIONS :            │
│  ☐ Add a README file                                    │
│  ☐ Add .gitignore                                       │
│  ☐ Choose a license                                     │
│                                                          │
│              [Cancel]              [Create repository]   │
└─────────────────────────────────────────────────────────┘
```

**Remplissez comme suit :**
- **Repository name** : `carslink` (ou ce que vous voulez)
- **Description** : `CarsLink Application - Next.js` (optionnel)
- **Visibilité** : **Private** (recommandé car votre code contient des clés)
- **NE PAS COCHER** :
  - ❌ Add a README file
  - ❌ Add .gitignore
  - ❌ Choose a license

3. **Cliquez sur "Create repository"**

### 2.3. Page suivante

Après avoir créé le dépôt, GitHub vous montrera cette page :

```
┌─────────────────────────────────────────────────────────┐
│  Quick setup — if you've done this kind of thing before │
│                                                          │
│  Or push an existing repository from the command line    │
│                                                          │
│  git remote add origin https://github.com/               │
│           VOTRE_USERNAME/carslink.git                    │
│                                                          │
│  git branch -M main                                      │
│                                                          │
│  git push -u origin main                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Notez bien l'URL** qui ressemble à :
```
https://github.com/VOTRE_USERNAME/carslink.git
```

---

## 💻 ÉTAPE 3 : Connecter votre code local à GitHub

### 3.1. Ouvrez votre terminal

Dans votre terminal, exécutez ces commandes **UNE PAR UNE** :

### 3.2. Commandes à exécuter

**Remplacez `VOTRE_USERNAME` par votre vrai nom d'utilisateur GitHub** dans la première commande :

```bash
# Aller dans le dossier CarsLink
cd "/Users/taytonaday/Desktop/Workplace Flynesis All/CarsLinkApp/CarsLink"

# Ajouter le dépôt GitHub comme "remote"
git remote add origin https://github.com/VOTRE_USERNAME/carslink.git

# Vérifier que c'est bien configuré
git remote -v

# Renommer la branche en "main" (si pas déjà fait)
git branch -M main

# Pousser votre code vers GitHub
git push -u origin main
```

### 3.3. Authentification GitHub

Quand vous exécutez `git push`, GitHub vous demandera de vous authentifier :

**Option A - Avec Token (Recommandé) :**
1. GitHub vous demandera votre **username** et **password**
2. Pour le password, utilisez un **Personal Access Token** :
   - Allez sur : https://github.com/settings/tokens
   - Cliquez sur **"Generate new token"** > **"Generate new token (classic)"**
   - Donnez un nom : `CarsLink Deployment`
   - Sélectionnez les permissions : **`repo`** (toutes les permissions repo)
   - Cliquez sur **"Generate token"**
   - **COPIEZ LE TOKEN** (vous ne le verrez qu'une fois!)
   - Utilisez ce token comme mot de passe quand Git vous le demande

**Option B - Avec GitHub CLI :**
```bash
# Installer GitHub CLI si pas déjà fait
brew install gh

# S'authentifier
gh auth login

# Puis pousser
git push -u origin main
```

### 3.4. Vérifier que ça a fonctionné

Après le push, **rafraîchissez la page GitHub** dans votre navigateur.

Vous devriez voir tous vos fichiers apparaître :

```
┌─────────────────────────────────────────────────────────┐
│  carslink                                                │
│                                                          │
│  📁 src/                                                 │
│  📁 supabase/                                           │
│  📄 amplify.yml                                          │
│  📄 package.json                                         │
│  📄 next.config.js                                       │
│  📄 GUIDE_VISUEL_DEPLOIEMENT.md                         │
│  ... (tous vos fichiers)                                │
│                                                          │
│  main branch • Latest commit: 50ad724                    │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Vérification

Avant de continuer vers AWS Amplify, vérifiez :

- [ ] Dépôt GitHub créé
- [ ] Code pushé sur GitHub (vous voyez vos fichiers sur GitHub)
- [ ] L'URL de votre dépôt : `https://github.com/VOTRE_USERNAME/carslink`

---

## 🎯 Prochaine Étape : AWS Amplify

Une fois que votre code est sur GitHub, vous pouvez :

1. **Aller sur AWS Amplify** : https://console.aws.amazon.com/amplify/
2. **Suivre le guide** : `GUIDE_VISUEL_DEPLOIEMENT.md` (à partir de l'ÉTAPE 2)

---

## 🆘 Problèmes Courants

### Erreur : "remote origin already exists"
```bash
# Supprimer l'ancien remote
git remote remove origin

# Ajouter le nouveau
git remote add origin https://github.com/VOTRE_USERNAME/carslink.git
```

### Erreur : "Permission denied"
- Vérifiez que vous êtes bien connecté à GitHub
- Vérifiez que vous avez les droits sur le dépôt
- Utilisez un Personal Access Token comme mot de passe

### Erreur : "Repository not found"
- Vérifiez que le nom du dépôt est correct
- Vérifiez que vous avez bien créé le dépôt sur GitHub
- Vérifiez que vous êtes bien connecté avec le bon compte GitHub

---

## 📸 Aperçu de ce que vous devriez voir

### Sur GitHub (après le push) :

```
┌──────────────────────────────────────────────┐
│  VOTRE_USERNAME / carslink                   │
│                                              │
│  [Code] [Issues] [Pull requests] ...        │
│                                              │
│  Latest commit 50ad724  [main ▼]            │
│                                              │
│  📁 src/                                     │
│  📁 supabase/                                │
│  📄 amplify.yml                              │
│  📄 package.json                             │
│  📄 next.config.js                           │
│  📄 GUIDE_VISUEL_DEPLOIEMENT.md             │
│  📄 DEPLOYMENT_GUIDE.md                      │
│  ...                                         │
└──────────────────────────────────────────────┘
```

**Parfait ! Une fois que vous voyez cela, vous êtes prêt pour AWS Amplify ! 🚀**

