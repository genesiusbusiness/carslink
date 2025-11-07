# Guide de déploiement AWS Amplify

## Prérequis

1. Installer AWS CLI :
```bash
brew install awscli  # Sur Mac
# ou
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
```

2. Configurer AWS CLI :
```bash
aws configure
# Entrez votre Access Key ID
# Entrez votre Secret Access Key
# Région: us-east-1 (ou votre région préférée)
# Format: json
```

## Déploiement via AWS CLI

### 1. Créer une nouvelle app Amplify

```bash
aws amplify create-app \
  --name carslink \
  --repository https://github.com/genesiusbusiness/carslink.git \
  --platform WEB \
  --iam-service-role-arn arn:aws:iam::YOUR_ACCOUNT_ID:role/AmplifyBackendRole
```

### 2. Créer une branche

```bash
aws amplify create-branch \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --framework NEXTJS \
  --stage PRODUCTION
```

### 3. Configurer les variables d'environnement

```bash
aws amplify update-app \
  --app-id YOUR_APP_ID \
  --environment-variables \
    NEXT_PUBLIC_SUPABASE_URL=https://yxkbvhymsvasknslhpsa.supabase.co \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM \
    SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
```

### 4. Lancer le déploiement

```bash
aws amplify start-job \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --job-type RELEASE
```

## Commandes utiles

### Vérifier le statut du déploiement

```bash
aws amplify get-job \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --job-id YOUR_JOB_ID
```

### Lister les apps Amplify

```bash
aws amplify list-apps
```

### Obtenir l'URL de l'app

```bash
aws amplify get-app \
  --app-id YOUR_APP_ID
```

## Configuration des rewrites (via console AWS)

Dans la console AWS Amplify :
1. Allez dans votre app
2. App settings > Rewrites and redirects
3. Ajoutez :
   - Source: `/<*>`
   - Target: `/index.html`
   - Type: `200 (Rewrite)`

## Variables d'environnement requises

- `NEXT_PUBLIC_SUPABASE_URL` : URL de votre instance Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service role Supabase (pour les opérations admin)
- `NODE_ENV` : `production`
- `NEXT_TELEMETRY_DISABLED` : `1` (optionnel)

## Troubleshooting

### Erreur de build
- Vérifiez les variables d'environnement
- Vérifiez que `amplify.yml` est correct
- Consultez les logs de build dans la console AWS

### Erreur 404 sur les routes
- Configurez les rewrites dans App settings > Rewrites and redirects
- Ajoutez la règle : `/<*>` → `/index.html` (200)

### Erreur de connexion Supabase
- Vérifiez que les variables d'environnement sont correctement configurées
- Vérifiez que les clés Supabase sont valides

