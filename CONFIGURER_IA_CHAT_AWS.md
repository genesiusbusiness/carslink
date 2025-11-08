# 🔧 Configurer l'IA Chat sur AWS Amplify

## ❌ Problème actuel

L'IA chat affiche "temporairement indisponible" sur l'application déployée (bmazo1.amplifyapp.com) alors qu'elle fonctionne en localhost.

## 🔍 Cause du problème

Les variables d'environnement pour l'API OpenRouter ne sont pas configurées sur AWS Amplify. L'application utilise un fallback hardcodé en local, mais sur AWS Amplify, il faut configurer les variables d'environnement.

## ✅ Solution : Configurer les variables d'environnement

### Étape 1 : Aller dans AWS Amplify

1. Allez sur : https://console.aws.amazon.com/amplify/
2. Cliquez sur votre app **"CarsLink: Présentation"** (ou l'app correspondante)
3. Dans le menu de gauche, cliquez sur **"App settings"**
4. Cliquez sur **"Environment variables"**

### Étape 2 : Ajouter les variables d'environnement pour l'IA

Cliquez sur **"Manage variables"** ou **"Add variable"** et ajoutez les variables suivantes :

#### Variables pour l'IA Chat (OpenRouter)

1. **AI_PROVIDER** (ou **AI_API_PROVIDER**)
   - **Valeur** : `openrouter`
   - **Description** : Fournisseur d'IA à utiliser

2. **OPENROUTER_API_KEY**
   - **Valeur** : `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`
   - **Description** : Clé API OpenRouter pour accéder à l'IA
   - **⚠️ IMPORTANT** : Cette clé est actuellement hardcodée dans le code. Pour la production, vous devriez la garder secrète.

3. **AI_MODEL** (optionnel)
   - **Valeur** : `mistralai/mixtral-8x7b-instruct`
   - **Description** : Modèle d'IA à utiliser (par défaut : mixtral-8x7b-instruct)

4. **AI_API_URL** (optionnel)
   - **Valeur** : `https://openrouter.ai/api/v1/chat/completions`
   - **Description** : URL de l'API OpenRouter (par défaut : OpenRouter)

#### Variables Supabase (si pas déjà configurées)

5. **NEXT_PUBLIC_SUPABASE_URL**
   - **Valeur** : `https://yxkbvhymsvasknslhpsa.supabase.co`
   - **Description** : URL de votre projet Supabase

6. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - **Valeur** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM`
   - **Description** : Clé anonyme publique de Supabase

7. **SUPABASE_SERVICE_ROLE_KEY**
   - **Valeur** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3MjUyNCwiZXhwIjoyMDc3MjQ4NTI0fQ.kn1G0sBMZ0beUbHE3fo1eUv0ZygPAt6adrghVXw9Nac`
   - **Description** : Clé service role de Supabase (pour les opérations admin)
   - **⚠️ IMPORTANT** : Cette clé doit être gardée secrète. Ne la partagez jamais publiquement.

### Étape 3 : Sauvegarder et redéployer

1. Cliquez sur **"Save"** pour sauvegarder les variables
2. AWS Amplify va automatiquement déclencher un nouveau déploiement
3. Attendez que le déploiement se termine (2-3 minutes)

### Étape 4 : Vérifier que ça fonctionne

1. Allez sur l'URL de votre app déployée : `https://bmazo1.amplifyapp.com`
2. Connectez-vous à votre compte
3. Allez dans l'Assistant IA
4. Testez en envoyant un message (ex: "J'ai un problème avec ma voiture")
5. L'IA devrait répondre normalement en français

## 📋 Liste complète des variables à ajouter

### Variables obligatoires pour l'IA Chat :

```
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=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
```

### Variables optionnelles pour l'IA Chat :

```
AI_MODEL=mistralai/mixtral-8x7b-instruct
AI_API_URL=https://openrouter.ai/api/v1/chat/completions
```

### Variables Supabase (si pas déjà configurées) :

```
NEXT_PUBLIC_SUPABASE_URL=https://yxkbvhymsvasknslhpsa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3MjUyNCwiZXhwIjoyMDc3MjQ4NTI0fQ.kn1G0sBMZ0beUbHE3fo1eUv0ZygPAt6adrghVXw9Nac
```

## 🔍 Pourquoi ça fonctionne en localhost mais pas sur AWS ?

### En localhost :
- Le code a des valeurs hardcodées en fallback (ligne 8-10 de `route.ts`)
- Si les variables d'environnement ne sont pas définies, le code utilise les valeurs par défaut
- C'est pourquoi ça fonctionne même sans `.env.local`

### Sur AWS Amplify :
- Les variables d'environnement doivent être explicitement configurées dans la console AWS
- Si elles ne sont pas configurées, `process.env.OPENROUTER_API_KEY` est `undefined`
- Le code vérifie si `AI_API_KEY` existe (ligne 72), et si ce n'est pas le cas, il lance une erreur
- L'erreur est capturée et affiche le message "temporairement indisponible"

## ✅ Vérification

Après avoir ajouté les variables :

1. ✅ Les variables sont sauvegardées dans AWS Amplify
2. ✅ Un nouveau déploiement est déclenché automatiquement
3. ✅ Le build se termine avec succès
4. ✅ L'IA chat fonctionne sur l'application déployée
5. ✅ L'IA répond en français

## 🆘 En cas de problème

Si après avoir ajouté les variables, l'IA chat ne fonctionne toujours pas :

1. Vérifiez que les variables sont bien sauvegardées dans AWS Amplify
2. Vérifiez que le nouveau déploiement s'est terminé avec succès
3. Vérifiez les logs dans AWS Amplify pour voir les erreurs
4. Ouvrez la console du navigateur (F12) et vérifiez les erreurs réseau
5. Partagez les logs avec moi pour que je puisse vous aider

## 📝 Notes importantes

- ⚠️ Les variables `NEXT_PUBLIC_*` sont accessibles côté client (dans le navigateur)
- 🔒 Les variables sans `NEXT_PUBLIC_` sont uniquement accessibles côté serveur
- 🔐 Ne partagez JAMAIS votre `OPENROUTER_API_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` publiquement
- 💡 Pour la production, vous devriez utiliser des secrets AWS Secrets Manager au lieu de hardcoder les clés

