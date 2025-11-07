# Déployer les mises à jour sur AWS Amplify

## Méthode 1 : Déploiement automatique (Recommandé)

Si votre app AWS Amplify est déjà connectée à GitHub, **les mises à jour se déploient automatiquement** à chaque push sur la branche `main`.

### Étapes :

1. **Pousser vos changements sur GitHub** :
```bash
cd "/Users/taytonaday/Desktop/Workplace Flynesis All/CarsLinkApp/CarsLink"
git add .
git commit -m "Votre message de commit"
git push origin main
```

2. **AWS Amplify détecte automatiquement le push** et lance un nouveau déploiement

3. **Vérifier le déploiement** :
   - Allez sur https://console.aws.amazon.com/amplify/
   - Sélectionnez votre app
   - Section **"Deployments"** : vous verrez le nouveau déploiement en cours
   - Cliquez dessus pour voir les logs en temps réel

## Méthode 2 : Déclencher manuellement un déploiement

Si le déploiement automatique ne se déclenche pas :

### Via la console AWS Amplify :

1. Allez sur https://console.aws.amazon.com/amplify/
2. Sélectionnez votre app
3. Cliquez sur **"Redeploy this version"** ou **"Deploy"**
4. Sélectionnez la branche `main` et le commit que vous voulez déployer
5. Cliquez sur **"Deploy"**

### Via AWS CLI :

```bash
# 1. Lister vos apps pour obtenir l'App ID
aws amplify list-apps

# 2. Lancer un nouveau déploiement
aws amplify start-job \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --job-type RELEASE
```

## Méthode 3 : Mettre à jour les variables d'environnement

Si vous avez modifié des variables d'environnement :

### Via la console AWS Amplify :

1. Allez dans votre app
2. **App settings** > **Environment variables**
3. Modifiez ou ajoutez les variables
4. Cliquez sur **"Save"**
5. Un nouveau déploiement sera automatiquement déclenché

### Via AWS CLI :

```bash
aws amplify update-app \
  --app-id YOUR_APP_ID \
  --environment-variables \
    NEXT_PUBLIC_SUPABASE_URL=https://yxkbvhymsvasknslhpsa.supabase.co \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle \
    SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key \
    NODE_ENV=production
```

## Vérifier le statut du déploiement

### Via la console AWS :

1. Allez dans votre app Amplify
2. Section **"Deployments"**
3. Vous verrez :
   - ✅ **Succeeded** : Déploiement réussi
   - 🔄 **In progress** : Déploiement en cours
   - ❌ **Failed** : Déploiement échoué (cliquez pour voir les logs)

### Via AWS CLI :

```bash
# Vérifier le statut du dernier déploiement
aws amplify list-jobs \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --max-results 1
```

## Commandes rapides pour déployer une mise à jour

```bash
# 1. Aller dans le dossier du projet
cd "/Users/taytonaday/Desktop/Workplace Flynesis All/CarsLinkApp/CarsLink"

# 2. Ajouter tous les changements
git add .

# 3. Créer un commit
git commit -m "feat: Description de vos changements"

# 4. Pousser sur GitHub (déclenche automatiquement le déploiement AWS)
git push origin main

# 5. Vérifier le statut (optionnel, via AWS CLI)
aws amplify list-jobs --app-id YOUR_APP_ID --branch-name main --max-results 1
```

## Workflow recommandé

1. **Faire vos modifications** dans le code
2. **Tester localement** : `npm run build`
3. **Commit et push** sur GitHub :
   ```bash
   git add .
   git commit -m "feat: Description"
   git push origin main
   ```
4. **AWS Amplify déploie automatiquement** (5-10 minutes)
5. **Vérifier le déploiement** dans la console AWS

## Troubleshooting

### Le déploiement ne se déclenche pas automatiquement

1. **Vérifier la connexion GitHub** :
   - App settings > General > Connected branches
   - Vérifiez que `main` est connectée

2. **Vérifier les webhooks GitHub** :
   - Allez sur votre repository GitHub
   - Settings > Webhooks
   - Vérifiez qu'il y a un webhook AWS Amplify

3. **Déclencher manuellement** :
   - Console AWS Amplify > Deploy > Redeploy

### Le déploiement échoue

1. **Vérifier les logs** :
   - Console AWS Amplify > Deployments > Cliquez sur le déploiement échoué
   - Regardez les logs de build

2. **Vérifier les variables d'environnement** :
   - App settings > Environment variables
   - Vérifiez que toutes les variables sont correctes

3. **Vérifier le build local** :
   ```bash
   npm run build
   ```
   Si le build échoue localement, il échouera aussi sur AWS

### Mettre à jour les rewrites

Si vous avez des problèmes de routing :

1. **App settings** > **Rewrites and redirects**
2. Vérifiez que vous avez :
   - Source: `/<*>`
   - Target: `/index.html`
   - Type: `200 (Rewrite)`

## Commandes utiles

### Obtenir l'URL de votre app

```bash
aws amplify get-app --app-id YOUR_APP_ID
```

### Voir les logs de build

Dans la console AWS Amplify :
- Deployments > Cliquez sur un déploiement > Logs

### Annuler un déploiement en cours

```bash
aws amplify stop-job \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --job-id YOUR_JOB_ID
```

