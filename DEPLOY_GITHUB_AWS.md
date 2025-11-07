# Déploiement AWS via GitHub

## Méthode : Connecter GitHub à AWS Amplify

### Étape 1 : Accéder à AWS Amplify Console

1. Allez sur : https://console.aws.amazon.com/amplify/
2. Connectez-vous à votre compte AWS
3. Cliquez sur **"New app"** > **"Host web app"**

### Étape 2 : Connecter votre repository GitHub

1. **Sélectionnez "GitHub"** comme source
2. **Autorisez AWS Amplify** à accéder à votre GitHub :
   - Cliquez sur "Authorize AWS Amplify"
   - Connectez-vous à GitHub si nécessaire
   - Autorisez l'accès au repository
3. **Sélectionnez votre repository** :
   - Repository : `genesiusbusiness/carslink`
   - Branch : `main`
4. Cliquez sur **"Next"**

### Étape 3 : Configurer le build

AWS Amplify détecte automatiquement Next.js grâce à votre `amplify.yml`.

**Vérifiez que la configuration est correcte :**
- Framework : `Next.js - SSR`
- Build settings : Utilise `amplify.yml` automatiquement
- Cliquez sur **"Next"**

### Étape 4 : Configurer les variables d'environnement

Dans la section **"Environment variables"**, ajoutez :

```
NEXT_PUBLIC_SUPABASE_URL = https://yxkbvhymsvasknslhpsa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM
SUPABASE_SERVICE_ROLE_KEY = votre_service_role_key_ici
NODE_ENV = production
NEXT_TELEMETRY_DISABLED = 1
```

### Étape 5 : Déployer

1. Cliquez sur **"Save and deploy"**
2. AWS Amplify va :
   - Cloner votre repository GitHub
   - Installer les dépendances (`npm ci`)
   - Builder l'application (`npm run build`)
   - Déployer sur AWS
3. Attendez la fin du build (5-10 minutes)

### Étape 6 : Configurer les rewrites (IMPORTANT)

**Après le premier déploiement**, allez dans :

1. **App settings** > **Rewrites and redirects**
2. Cliquez sur **"Add rewrite rule"**
3. Ajoutez :
   - **Source address** : `/<*>`
   - **Target address** : `/index.html`
   - **Type** : `200 (Rewrite)`
4. Cliquez sur **"Save"**

Cette règle est nécessaire pour que le routing Next.js fonctionne correctement.

## Déploiement automatique

Une fois configuré, **chaque push sur la branche `main` déclenchera automatiquement un nouveau déploiement**.

### Vérifier le statut du déploiement

1. Allez dans votre app Amplify
2. Section **"Deployments"** : vous verrez tous les déploiements
3. Cliquez sur un déploiement pour voir les logs

### URL de votre application

Après le déploiement, vous obtiendrez une URL comme :
```
https://main.xxxxx.amplifyapp.com
```

Cette URL sera visible dans la console AWS Amplify.

## Commandes utiles (si vous avez AWS CLI)

### Vérifier le statut

```bash
aws amplify list-apps
```

### Obtenir l'URL de l'app

```bash
aws amplify get-app --app-id YOUR_APP_ID
```

## Troubleshooting

### Erreur de build
- Vérifiez les logs dans la console AWS Amplify
- Vérifiez que toutes les variables d'environnement sont configurées
- Vérifiez que `amplify.yml` est correct

### Erreur 404 sur les routes
- Configurez les rewrites : `/<*>` → `/index.html` (200)
- Vérifiez dans App settings > Rewrites and redirects

### Erreur de connexion Supabase
- Vérifiez que les variables d'environnement sont correctes
- Vérifiez que les clés Supabase sont valides

### Le déploiement ne se déclenche pas automatiquement
- Vérifiez que la connexion GitHub est active
- Vérifiez que vous poussez sur la branche `main`
- Vérifiez dans App settings > General > Connected branches

