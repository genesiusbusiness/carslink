# Configurer Supabase pour l'application déployée sur AWS

## ⚠️ Clarification importante

### Pendant le BUILD (AWS Amplify)
- ❌ AWS Amplify ne se connecte PAS à Supabase
- ✅ AWS Amplify build juste votre application Next.js

### Une fois l'application DÉPLOYÉE et EN LIGNE
- ✅ L'application DOIT se connecter à Supabase pour fonctionner
- ✅ C'est normal et nécessaire
- ✅ L'application utilisera les variables d'environnement pour se connecter

## Configuration requise

### 1. Variables d'environnement dans AWS Amplify

Pour que votre application déployée puisse se connecter à Supabase, vous DEVEZ configurer les variables d'environnement dans AWS Amplify :

#### Étapes :

1. **Allez sur AWS Amplify Console** : https://console.aws.amazon.com/amplify/
2. **Sélectionnez votre app** : "CarsLink: Présentation"
3. **Allez dans** : **App settings** > **Environment variables**
4. **Ajoutez ces variables** :

```
NEXT_PUBLIC_SUPABASE_URL = https://yxkbvhymsvasknslhpsa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM
SUPABASE_SERVICE_ROLE_KEY = votre_service_role_key_ici
NODE_ENV = production
NEXT_TELEMETRY_DISABLED = 1
```

5. **Cliquez sur "Save"**
6. **Un nouveau déploiement sera automatiquement déclenché**

### 2. Comment ça fonctionne

#### Pendant le build (AWS Amplify) :
```
GitHub → AWS Amplify → npm ci → npm run build → Déploie
```
❌ Aucune connexion à Supabase

#### Une fois l'application en ligne :
```
Utilisateur → Votre app AWS → Se connecte à Supabase → Lit/Écrit dans la base
```
✅ Connexion normale et nécessaire

### 3. Vérifier que ça fonctionne

Une fois déployé avec les variables d'environnement :

1. **Allez sur votre URL** : https://main.d38kioid2903qc.amplifyapp.com
2. **Testez l'application** :
   - Connexion utilisateur
   - Affichage des données
   - Création de rendez-vous
   - etc.

Si tout fonctionne, c'est que l'application se connecte bien à Supabase ! ✅

### 4. Variables d'environnement expliquées

#### `NEXT_PUBLIC_SUPABASE_URL`
- URL de votre instance Supabase
- Utilisée par l'application pour se connecter
- **Nécessaire** pour que l'app fonctionne

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Clé anonyme Supabase
- Permet à l'application de se connecter
- **Nécessaire** pour que l'app fonctionne

#### `SUPABASE_SERVICE_ROLE_KEY`
- Clé service role (pour les opérations admin)
- Utilisée par `encryption.ts` et les API routes
- **Nécessaire** pour certaines fonctionnalités

### 5. Pourquoi le déploiement a échoué ?

Probablement parce que les variables d'environnement n'étaient pas configurées dans AWS Amplify.

**Solution** : Ajoutez les variables d'environnement comme indiqué ci-dessus.

### 6. Workflow complet

1. **Code sur GitHub** ✅ (déjà fait)
2. **Variables d'environnement dans AWS Amplify** ⚠️ (à faire)
3. **Déploiement automatique** ✅ (se fera après avoir ajouté les variables)
4. **Application en ligne** ✅ (se connectera à Supabase automatiquement)

## Résumé

✅ **Pendant le build** : AWS Amplify ne touche pas à Supabase
✅ **Une fois déployé** : L'application se connecte à Supabase (normal et nécessaire)
✅ **Configuration** : Ajoutez les variables d'environnement dans AWS Amplify
✅ **Résultat** : Votre app en ligne lira et écrira dans Supabase

## Action immédiate

**Allez dans AWS Amplify Console** et ajoutez les variables d'environnement listées ci-dessus. C'est la seule chose à faire pour que votre application déployée puisse se connecter à Supabase !

