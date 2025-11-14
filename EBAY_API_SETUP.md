# 🔑 Configuration de l'API eBay pour CarsLink Marketplace

Ce guide vous explique comment configurer l'intégration eBay pour le marketplace CarsLink.

## 📋 Prérequis

1. **Compte eBay Developer** : Vous devez être inscrit sur [eBay Developer](https://developer.ebay.com/)
2. **Application créée** : Une application doit être créée dans votre compte développeur

---

## 🔐 Étape 1 : Obtenir vos clés API

### 1.1 Accéder au portail développeur

1. Allez sur [https://developer.ebay.com/](https://developer.ebay.com/)
2. Connectez-vous avec votre compte eBay Developer

### 1.2 Créer ou accéder à votre application

1. Dans le menu, allez dans **"My Account"** > **"Keys & Tokens"**
2. Si vous n'avez pas encore d'application :
   - Cliquez sur **"Create an App Key"**
   - Remplissez le formulaire :
     - **App Name** : `CarsLink Marketplace` (ou le nom de votre choix)
     - **Developer Account Type** : 
       - **Sandbox** : Pour tester (recommandé au début)
       - **Production** : Pour la mise en production
   - Cliquez sur **"Create"**

### 1.3 Récupérer vos clés

Une fois l'application créée, vous verrez :

- **App ID (Client ID)** : Identifiant de votre application
- **Client Secret** : Secret de votre application (⚠️ à garder secret)
- **Dev ID** : Identifiant développeur (optionnel pour certaines APIs)

**⚠️ IMPORTANT** : Notez ces valeurs, vous en aurez besoin pour la configuration.

---

## 🔧 Étape 2 : Configurer les variables d'environnement

### 2.1 En local (développement)

Créez ou modifiez le fichier `.env.local` à la racine du projet :

```env
# eBay API Configuration
EBAY_APP_ID=votre_app_id_ici
EBAY_CLIENT_SECRET=votre_client_secret_ici
EBAY_DEV_ID=votre_dev_id_ici  # Optionnel
EBAY_ENVIRONMENT=sandbox  # ou "production"
```

### 2.2 Sur AWS Amplify (production)

1. Allez dans [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Sélectionnez votre application CarsLink
3. Dans le menu de gauche, cliquez sur **"Environment variables"**
4. Ajoutez les variables suivantes :

| Variable Name | Value | Type |
|--------------|-------|------|
| `EBAY_APP_ID` | `votre_app_id` | **Secret** |
| `EBAY_CLIENT_SECRET` | `votre_client_secret` | **Secret** |
| `EBAY_DEV_ID` | `votre_dev_id` (optionnel) | **Secret** |
| `EBAY_ENVIRONMENT` | `sandbox` ou `production` | **Plain text** |

5. Cliquez sur **"Save"**
6. **Redéployez** l'application

---

## 📚 Étape 3 : Documentation de l'API eBay

### 3.1 Browse API (recherche et détails d'articles)

**Documentation principale** : [https://developer.ebay.com/api-docs/buy/browse/overview.html](https://developer.ebay.com/api-docs/buy/browse/overview.html)

**Endpoints utiles pour le marketplace** :

1. **Recherche d'articles** :
   - Endpoint : `GET /buy/browse/v1/item_summary/search`
   - Documentation : [Search API](https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search)
   - Permet de rechercher des articles par mot-clé, catégorie, etc.

2. **Détails d'un article** :
   - Endpoint : `GET /buy/browse/v1/item/{item_id}`
   - Documentation : [Get Item API](https://developer.ebay.com/api-docs/buy/browse/resources/item/methods/getItem)
   - Récupère les détails complets d'un article

3. **Vérification de compatibilité** :
   - Endpoint : `POST /buy/browse/v1/item/{item_id}/check_compatibility`
   - Documentation : [Check Compatibility API](https://developer.ebay.com/api-docs/buy/browse/resources/item/methods/checkCompatibility)
   - **Très utile pour les pièces auto** : Vérifie si une pièce est compatible avec un véhicule spécifique

### 3.2 Authentification

**Application Access Token** (pour les appels publics) :
- Documentation : [OAuth Application Credentials](https://developer.ebay.com/api-docs/static/oauth-application-credentials.html)
- Permet d'accéder aux APIs publiques sans authentification utilisateur

**User Access Token** (pour les actions utilisateur) :
- Documentation : [OAuth User Tokens](https://developer.ebay.com/api-docs/static/oauth-user-tokens.html)
- Nécessaire pour les actions nécessitant un utilisateur connecté

---

## 🧪 Étape 4 : Tester l'intégration

### 4.1 Vérifier la configuration

Une fois les variables configurées, vous pouvez tester l'API via :

1. **Interface de test eBay** : [API Explorer](https://developer.ebay.com/my/keys)
2. **Postman** : Importez la collection d'APIs eBay
3. **Code** : Utilisez les fonctions dans `/src/lib/ebay/`

### 4.2 Exemple de recherche

```typescript
// Exemple de recherche de pièces auto
const searchParams = {
  q: "brake pads", // Terme de recherche
  category_ids: "6030", // Catégorie pièces auto
  limit: 20,
  sort: "price",
  filter: "deliveryCountry:FR" // France uniquement
};
```

---

## 🔒 Sécurité

### ⚠️ Ne JAMAIS :

- ❌ Commiter les clés API dans Git
- ❌ Exposer les clés dans le code source
- ❌ Partager les clés publiquement
- ❌ Utiliser les clés de production en développement

### ✅ Toujours :

- ✅ Utiliser les variables d'environnement
- ✅ Stocker les clés comme "Secret" dans AWS Amplify
- ✅ Utiliser Sandbox pour les tests
- ✅ Régénérer les clés si elles sont compromises

---

## 📝 Notes importantes

1. **Sandbox vs Production** :
   - **Sandbox** : Environnement de test, données fictives
   - **Production** : Données réelles, nécessite une validation eBay

2. **Limites de taux** :
   - eBay impose des limites sur le nombre d'appels API
   - Consultez la documentation pour les limites spécifiques

3. **Catégories de pièces auto** :
   - Catégorie principale : `6030` (Parts & Accessories > Car & Truck Parts)
   - Sous-catégories disponibles dans la documentation

---

## 🆘 Support

- **Documentation eBay** : [https://developer.ebay.com/](https://developer.ebay.com/)
- **Forum développeur** : [eBay Developer Forums](https://community.ebay.com/t5/Developer-Community/ct-p/developer-community)
- **Support technique** : Via le portail développeur eBay

---

## ✅ Checklist de configuration

- [ ] Compte eBay Developer créé
- [ ] Application créée dans le portail développeur
- [ ] App ID (Client ID) récupéré
- [ ] Client Secret récupéré
- [ ] Variables d'environnement configurées (local)
- [ ] Variables d'environnement configurées (AWS Amplify)
- [ ] Application redéployée
- [ ] Test de connexion à l'API réussi

