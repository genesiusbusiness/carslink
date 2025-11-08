# Configuration des variables d'environnement AWS Amplify pour OpenRouter

## Variables à configurer dans AWS Amplify

Allez dans **AWS Amplify Console** → **Votre app** → **Environment variables** et ajoutez les variables suivantes :

### Variables OpenRouter

```
OPENROUTER_API_KEY=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
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=https://main.dsnxou1bmazo1.amplifyapp.com
OPENROUTER_REFERER=https://main.dsnxou1bmazo1.amplifyapp.com
NODE_ENV=production
```

## Comment configurer dans AWS Amplify

1. **Connectez-vous à AWS Amplify Console** : https://console.aws.amazon.com/amplify/
2. **Sélectionnez votre app** : "CarsLink: Présentation"
3. **Allez dans "App settings"** → **"Environment variables"**
4. **Cliquez sur "Manage variables"**
5. **Ajoutez chaque variable** une par une :
   - Cliquez sur "Add variable"
   - Entrez le nom de la variable (ex: `OPENROUTER_API_KEY`)
   - Entrez la valeur (ex: `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`)
   - Cliquez sur "Save"
6. **Répétez pour toutes les variables** listées ci-dessus
7. **Redéployez l'application** : Allez dans "Deployments" → "Redeploy this version" ou attendez le prochain push sur GitHub

## Variables expliquées

- **`OPENROUTER_API_KEY`** : Votre clé API OpenRouter (obligatoire)
- **`OPENROUTER_BASE_URL`** : URL de base de l'API OpenRouter (par défaut: `https://openrouter.ai/api/v1`)
- **`OPENROUTER_SITE_URL`** : URL de votre site déployé sur AWS Amplify
- **`OPENROUTER_REFERER`** : URL de référence pour OpenRouter (généralement la même que `OPENROUTER_SITE_URL`)
- **`NODE_ENV`** : Environnement Node.js (doit être `production` pour AWS Amplify)

## Fallback pour le développement local

Le code utilise des valeurs hardcodées en fallback pour le développement local, donc vous n'avez **pas besoin** de créer un fichier `.env.local` pour tester en localhost.

## Vérification

Après avoir configuré les variables et redéployé, testez l'endpoint de test :
- `https://votre-app.amplifyapp.com/api/test-openrouter`

Vous devriez voir une réponse JSON avec les résultats des tests OpenRouter.

## Important

⚠️ **Ne jamais commit le fichier `.env` sur GitHub** - Les variables sont maintenant configurées directement dans AWS Amplify.

