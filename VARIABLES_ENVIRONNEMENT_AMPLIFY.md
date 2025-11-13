# 🔒 Variables d'Environnement AWS Amplify

Ce document liste **TOUTES** les variables d'environnement à configurer dans AWS Amplify pour que l'application fonctionne correctement et de manière sécurisée.

## ⚠️ IMPORTANT - SÉCURITÉ

**NE JAMAIS** commiter ces valeurs dans le code source. Elles doivent **UNIQUEMENT** être configurées dans AWS Amplify Console.

---

## 📋 Variables Requises

### 1. **OPENROUTER_API_KEY** (OBLIGATOIRE)
- **Description** : Clé API pour OpenRouter (service AI)
- **Où la trouver** : https://openrouter.ai/keys
- **Format** : `sk-or-v1-...`
- **Exemple** : `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`
- **Sécurité** : ⚠️ **SECRET** - Ne jamais exposer publiquement

### 2. **SUPABASE_SERVICE_ROLE_KEY** (OBLIGATOIRE)
- **Description** : Clé service role de Supabase (pour les opérations admin côté serveur)
- **Où la trouver** : Supabase Dashboard → Settings → API → `service_role` key
- **Format** : JWT token
- **Exemple** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Sécurité** : ⚠️ **TRÈS SECRET** - Accès complet à la base de données, ne jamais exposer

### 3. **NEXT_PUBLIC_SUPABASE_URL** (OPTIONNEL mais recommandé)
- **Description** : URL de votre projet Supabase
- **Où la trouver** : Supabase Dashboard → Settings → API → Project URL
- **Format** : `https://xxxxx.supabase.co`
- **Exemple** : `https://yxkbvhymsvasknslhpsa.supabase.co`
- **Sécurité** : ✅ **PUBLIQUE** - Peut être exposée (utilisée côté client)

---

## 🚀 Configuration dans AWS Amplify

### Étape 1 : Accéder aux Variables d'Environnement

1. Connectez-vous à [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Sélectionnez votre application CarsLink
3. Dans le menu de gauche, cliquez sur **"Environment variables"** (ou **"Variables d'environnement"**)

### Étape 2 : Ajouter les Variables

Pour chaque variable, cliquez sur **"Add variable"** et remplissez :

| Variable Name | Value | Type |
|--------------|-------|------|
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | **Secret** |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | **Secret** |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yxkbvhymsvasknslhpsa.supabase.co` | **Plain text** |

### Étape 3 : Redéployer

Après avoir ajouté les variables :
1. Cliquez sur **"Save"**
2. Allez dans **"Redeploy this version"** ou attendez le prochain déploiement automatique

---

## 🔍 Vérification

### Vérifier que les variables sont bien configurées

1. Dans AWS Amplify, allez dans **"Environment variables"**
2. Vérifiez que les 3 variables sont présentes
3. Pour les variables secrètes, vous verrez `****` au lieu de la valeur réelle (c'est normal)

### Tester l'application

1. Une fois déployée, testez l'assistant AI (`/ai-chat`)
2. Si vous voyez une erreur `Missing OPENROUTER_API_KEY`, vérifiez que la variable est bien configurée
3. Si vous voyez une erreur `SUPABASE_SERVICE_ROLE_KEY is not set`, vérifiez que la variable est bien configurée

---

## 🛡️ Sécurité - Ce qui est PUBLIC vs SECRET

### ✅ PUBLIC (peut être dans le code)
- `NEXT_PUBLIC_SUPABASE_URL` - URL publique de Supabase
- Clés `anon` de Supabase - Conçues pour être publiques (protégées par RLS)

### ⚠️ SECRET (NE JAMAIS dans le code)
- `OPENROUTER_API_KEY` - Clé API privée
- `SUPABASE_SERVICE_ROLE_KEY` - Clé admin avec accès complet

---

## 📝 Notes Importantes

1. **Les variables avec `NEXT_PUBLIC_`** sont accessibles côté client (navigateur)
2. **Les autres variables** sont uniquement accessibles côté serveur (API routes)
3. **Ne jamais** commiter les valeurs secrètes dans Git
4. **Toujours** utiliser les variables d'environnement pour les secrets

---

## 🔄 Mise à Jour des Variables

Si vous devez changer une variable :

1. Allez dans **"Environment variables"** dans AWS Amplify
2. Cliquez sur la variable à modifier
3. Modifiez la valeur
4. Cliquez sur **"Save"**
5. Redéployez l'application

---

## ❓ Dépannage

### Erreur : "Missing OPENROUTER_API_KEY"
- ✅ Vérifiez que `OPENROUTER_API_KEY` est configurée dans Amplify
- ✅ Vérifiez l'orthographe (sensible à la casse)
- ✅ Redéployez après avoir ajouté la variable

### Erreur : "SUPABASE_SERVICE_ROLE_KEY is not set"
- ✅ Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est configurée dans Amplify
- ✅ Vérifiez que vous avez copié la clé complète (très longue)
- ✅ Redéployez après avoir ajouté la variable

### L'application fonctionne en local mais pas sur Amplify
- ✅ Vérifiez que toutes les variables sont configurées dans Amplify
- ✅ Les variables `.env.local` ne sont pas utilisées par Amplify
- ✅ Vous devez les configurer dans la console Amplify

---

## 📞 Support

Si vous avez des questions ou des problèmes :
1. Vérifiez ce document
2. Vérifiez les logs dans AWS Amplify Console → Deployments → Logs
3. Contactez l'équipe de développement

