# Guide de Déploiement AWS Amplify via GitHub

Ce guide vous explique comment déployer CarsLink sur AWS Amplify en utilisant GitHub comme source de code.

## 📋 Prérequis

- Un compte AWS
- Un compte GitHub
- Le dépôt GitHub contenant le code de CarsLink

## 🚀 Étapes de Déploiement

### 1. Préparer le dépôt GitHub

Assurez-vous que votre code est bien pushé sur GitHub :

```bash
git add .
git commit -m "Préparation pour déploiement AWS Amplify"
git push origin main
```

### 2. Connecter AWS Amplify à GitHub

1. **Connectez-vous à AWS Amplify Console**
   - Allez sur https://console.aws.amazon.com/amplify/
   - Cliquez sur **"New app"** > **"Host web app"**

2. **Sélectionnez GitHub**
   - Choisissez **"GitHub"** comme source de code
   - Autorisez AWS Amplify à accéder à votre compte GitHub si nécessaire
   - Sélectionnez votre dépôt : `CarsLink` (ou le nom de votre dépôt)
   - Sélectionnez la branche : `main` (ou `master`)

3. **Configurez les paramètres de build**
   - AWS Amplify détectera automatiquement Next.js
   - Vérifiez que les paramètres suivants sont corrects :
     - **App name**: `carslink` (ou le nom de votre choix)
     - **Build settings**: Le fichier `amplify.yml` sera détecté automatiquement
     - **Environment variables**: (voir section ci-dessous)

### 3. Variables d'Environnement (Optionnel)

Si vous souhaitez utiliser des variables d'environnement au lieu de hardcoder les clés :

1. Dans **"Environment variables"**, ajoutez :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://yxkbvhymsvasknslhpsa.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. Ensuite, modifiez `src/lib/supabaseClient.ts` pour utiliser :
   ```typescript
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   ```

**Note**: Actuellement, les clés sont hardcodées dans le code, donc cette étape est optionnelle.

### 4. Configurer les Rewrites et Redirects

1. Après le déploiement initial, allez dans **"App settings"** > **"Rewrites and redirects"**
2. Ajoutez cette règle pour le routing Next.js :
   - **Source address**: `/<*>`
   - **Target address**: `/index.html`
   - **Type**: `200 (Rewrite)`
   - Cliquez sur **"Save"**

### 5. Déployer

1. Cliquez sur **"Save and deploy"**
2. AWS Amplify va :
   - Cloner votre dépôt GitHub
   - Installer les dépendances (`npm ci`)
   - Builder l'application (`npm run build`)
   - Déployer sur AWS

3. Attendez la fin du build (environ 5-10 minutes)

### 6. Vérifier le Déploiement

Une fois le déploiement terminé :

1. Vous obtiendrez une URL comme : `https://main.xxxxxxxxx.amplifyapp.com`
2. Testez l'application pour vérifier que tout fonctionne
3. Les routes Next.js devraient fonctionner correctement

## 🔄 Déploiements Automatiques

Une fois configuré, AWS Amplify déploiera automatiquement :

- **À chaque push sur la branche principale** (main/master)
- **À chaque merge de Pull Request** (si configuré)

Vous pouvez voir tous les déploiements dans l'onglet **"Deployments"** de la console Amplify.

## 🛠️ Déploiement Manuel

Pour déclencher un déploiement manuel :

1. Allez dans **"Deployments"**
2. Cliquez sur **"Redeploy this version"** pour redéployer la dernière version
3. Ou cliquez sur **"Trigger deployment"** > **"Deploy latest commit"**

## 🔍 Résolution de Problèmes

### Erreur 404 sur les routes

Si vous obtenez des erreurs 404 :

1. Vérifiez que les rewrites sont configurés (étape 4)
2. Vérifiez les logs de build dans **"Deployments"** > **[Votre déploiement]**
3. Assurez-vous que le build réussit sans erreur

### Erreurs de build

1. Vérifiez les logs de build dans la console Amplify
2. Assurez-vous que toutes les dépendances sont dans `package.json`
3. Vérifiez que `node_modules` n'est pas commité (devrait être dans `.gitignore`)

### Problèmes avec Supabase

1. Vérifiez que les clés Supabase sont correctes
2. Vérifiez que les domaines Supabase sont autorisés dans `next.config.js`
3. Si vous utilisez des variables d'environnement, vérifiez qu'elles sont bien configurées

## 📝 Fichiers Importants

- `amplify.yml` : Configuration du build Amplify
- `next.config.js` : Configuration Next.js
- `package.json` : Dépendances et scripts
- `.gitignore` : Fichiers à ignorer dans Git

## 🔐 Sécurité

**Important**: Les clés Supabase sont actuellement hardcodées dans le code. Pour la production, il est recommandé de :

1. Utiliser des variables d'environnement AWS Amplify
2. Ne jamais commit les clés dans le dépôt public
3. Utiliser des clés différentes pour développement et production

## 📞 Support

En cas de problème, consultez :
- [Documentation AWS Amplify](https://docs.aws.amazon.com/amplify/)
- [Documentation Next.js](https://nextjs.org/docs)
- Les logs de build dans la console AWS Amplify

