# 🔧 Configurer les variables d'environnement sur AWS Amplify

## ❌ Problème actuel

L'application est déployée mais ne peut pas se connecter à Supabase car les variables d'environnement ne sont pas configurées dans AWS Amplify.

## ✅ Solution : Configurer les variables d'environnement

### Étape 1 : Aller dans AWS Amplify

1. Allez sur : https://console.aws.amazon.com/amplify/
2. Cliquez sur votre app **"CarsLink: Présentation"**
3. Dans le menu de gauche, cliquez sur **"App settings"**
4. Cliquez sur **"Environment variables"**

### Étape 2 : Ajouter les variables d'environnement

Cliquez sur **"Manage variables"** ou **"Add variable"** et ajoutez les variables suivantes :

#### Variables publiques (NEXT_PUBLIC_*)

Ces variables sont accessibles côté client et sont nécessaires pour que l'app se connecte à Supabase :

1. **NEXT_PUBLIC_SUPABASE_URL**
   - **Valeur** : `https://yxkbvhymsvasknslhpsa.supabase.co`
   - **Description** : URL de votre projet Supabase

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - **Valeur** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM`
   - **Description** : Clé anonyme publique de Supabase (sécurisée pour le client)

#### Variables privées (server-side only)

Ces variables sont utilisées uniquement côté serveur pour les opérations sensibles :

3. **SUPABASE_SERVICE_ROLE_KEY** (optionnel mais recommandé)
   - **Valeur** : Votre clé service role de Supabase
   - **Description** : Clé service role pour les opérations admin (NE JAMAIS EXPOSER EN PUBLIC)
   - **⚠️ IMPORTANT** : Cette clé doit être gardée secrète. Ne la partagez jamais publiquement.

### Étape 3 : Sauvegarder et redéployer

1. Cliquez sur **"Save"** pour sauvegarder les variables
2. AWS Amplify va automatiquement déclencher un nouveau déploiement
3. Attendez que le déploiement se termine (2-3 minutes)

### Étape 4 : Vérifier que ça fonctionne

1. Allez sur l'URL de votre app déployée
2. Essayez de vous connecter
3. Vérifiez que les données s'affichent correctement

## 📋 Liste complète des variables à ajouter

### Variables obligatoires :

```
NEXT_PUBLIC_SUPABASE_URL=https://yxkbvhymsvasknslhpsa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM
```

### Variables optionnelles (si vous utilisez l'encryption server-side) :

```
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role_ici
```

## 🔍 Comment trouver votre clé Supabase Service Role

Si vous avez besoin de la clé service role :

1. Allez sur : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **"Settings"** → **"API"**
4. Copiez la **"service_role" key** (⚠️ NE JAMAIS PARTAGER CETTE CLÉ)

## ✅ Vérification

Après avoir ajouté les variables :

1. ✅ Les variables sont sauvegardées dans AWS Amplify
2. ✅ Un nouveau déploiement est déclenché automatiquement
3. ✅ Le build se termine avec succès
4. ✅ L'application peut se connecter à Supabase
5. ✅ Les données s'affichent correctement

## 🆘 En cas de problème

Si après avoir ajouté les variables, l'application ne fonctionne toujours pas :

1. Vérifiez que les variables sont bien sauvegardées dans AWS Amplify
2. Vérifiez que le nouveau déploiement s'est terminé avec succès
3. Vérifiez les logs dans AWS Amplify pour voir les erreurs
4. Partagez les logs avec moi pour que je puisse vous aider

## 📝 Notes importantes

- ⚠️ Les variables `NEXT_PUBLIC_*` sont accessibles côté client (dans le navigateur)
- 🔒 Les variables sans `NEXT_PUBLIC_` sont uniquement accessibles côté serveur
- 🔐 Ne partagez JAMAIS votre `SUPABASE_SERVICE_ROLE_KEY` publiquement
- ✅ Les variables sont appliquées au prochain déploiement automatiquement

