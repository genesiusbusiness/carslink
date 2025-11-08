# Configuration du Chat IA pour CarsLink

## 📋 Vue d'ensemble

Le système de chat IA permet aux clients de décrire un problème avec leur véhicule et d'obtenir :
- 3 causes probables du problème
- Le niveau d'urgence (urgent, modéré, faible)
- Un service recommandé
- Un bouton de réservation avec pré-remplissage automatique

## 🔧 Configuration de l'API IA

### Option 1 : OpenRouter (Recommandé - Gratuit avec limite)

1. Créez un compte sur [OpenRouter](https://openrouter.ai/)
2. Générez une clé API gratuite
3. Ajoutez la variable d'environnement :

```env
OPENROUTER_API_KEY=votre_cle_api_ici
AI_API_PROVIDER=openrouter
AI_API_URL=https://openrouter.ai/api/v1/chat/completions
```

### Option 2 : Hugging Face Inference API

1. Créez un compte sur [Hugging Face](https://huggingface.co/)
2. Générez un token d'accès
3. Ajoutez la variable d'environnement :

```env
HUGGINGFACE_API_KEY=votre_token_ici
AI_API_PROVIDER=huggingface
```

### Option 3 : Mode sans API (Par défaut)

Si aucune clé API n'est configurée, le système fonctionne en mode dégradé avec des réponses par défaut.

## 🗄️ Base de données

### Migration SQL

Appliquez la migration SQL suivante dans Supabase :

```sql
-- Fichier : Flynesis App/Flynesis Acoount/supabase/migrations/20250105000000_create_ai_chat_tables.sql
```

Cette migration crée :
- `ai_chat_conversations` : Table des conversations IA
- `ai_chat_messages` : Table des messages individuels
- RLS policies pour la sécurité des données

### Tables créées

#### `ai_chat_conversations`
- `id` : UUID (clé primaire)
- `flynesis_user_id` : UUID (référence à `fly_accounts`)
- `vehicle_id` : UUID (optionnel, référence à `vehicles`)
- `appointment_id` : UUID (optionnel, référence à `appointments`)
- `garage_id` : UUID (optionnel, référence à `carslink_garages`)
- `status` : TEXT ('active', 'resolved', 'archived')
- `created_at` : TIMESTAMPTZ
- `updated_at` : TIMESTAMPTZ

#### `ai_chat_messages`
- `id` : UUID (clé primaire)
- `conversation_id` : UUID (référence à `ai_chat_conversations`)
- `role` : TEXT ('user', 'assistant')
- `content` : TEXT (contenu du message)
- `ai_analysis` : JSONB (analyse IA structurée)
- `created_at` : TIMESTAMPTZ

## 🔐 Sécurité (RLS Policies)

### Clients
- Peuvent voir et créer leurs propres conversations
- Peuvent voir et créer des messages dans leurs conversations

### Garages
- Peuvent voir les conversations liées à leurs rendez-vous
- Peuvent voir les messages des conversations liées à leurs rendez-vous

### Support
- Peuvent voir toutes les conversations et messages

## 🚀 Utilisation

### Accès au chat IA

1. Depuis la page d'accueil : Cliquez sur le bouton "Assistant IA"
2. Depuis le menu : Accédez à `/ai-chat`

### Fonctionnalités

1. **Description du problème** : Le client décrit son problème automobile
2. **Analyse IA** : L'IA analyse le problème et fournit :
   - 3 causes probables
   - Niveau d'urgence
   - Service recommandé
3. **Réservation** : Bouton "Réserver un rendez-vous" qui préremplit le service recommandé

### Exemples de questions

- "J'ai un bruit au freinage"
- "Un voyant s'allume sur mon tableau de bord"
- "Ma voiture fait des à-coups"
- "J'ai une fuite d'huile"

## 📝 Variables d'environnement

### ⚠️ IMPORTANT : Variables Supabase requises

Le chat IA nécessite ces variables d'environnement Supabase pour fonctionner. **Configurez-les dans AWS Amplify** (ou votre plateforme de déploiement) :

#### Variables à configurer dans AWS Amplify :

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Valeur : `https://yxkbvhymsvasknslhpsa.supabase.co`
   - Description : URL de votre projet Supabase

2. **SUPABASE_SERVICE_ROLE_KEY**
   - Valeur : Votre clé service_role de Supabase
   - Description : Clé service role pour les opérations serveur (NE JAMAIS EXPOSER EN PUBLIC)

**Comment configurer dans AWS Amplify :**
1. Allez dans AWS Amplify Console
2. Sélectionnez votre app CarsLink
3. App settings → Environment variables
4. Ajoutez les variables ci-dessus
5. Sauvegardez et redéployez

### Variables optionnelles pour l'IA

Si vous souhaitez utiliser l'IA externe, ajoutez également dans AWS Amplify :

- **OPENROUTER_API_KEY** (pour OpenRouter)
- **AI_API_PROVIDER** = `openrouter`
- **AI_API_URL** = `https://openrouter.ai/api/v1/chat/completions`

OU

- **HUGGINGFACE_API_KEY** (pour Hugging Face)
- **AI_API_PROVIDER** = `huggingface`

**Note :** Si aucune clé API IA n'est configurée, le système fonctionnera en mode dégradé avec des réponses par défaut.

## 🐛 Dépannage

### Erreur : "API key not configured"
- Vérifiez que la variable d'environnement `OPENROUTER_API_KEY` ou `HUGGINGFACE_API_KEY` est définie
- Redémarrez le serveur après avoir ajouté les variables

### Erreur : "Service indisponible"
- Vérifiez que votre clé API est valide
- Vérifiez que vous n'avez pas dépassé les limites de l'API gratuite
- Le système fonctionnera en mode dégradé avec des réponses par défaut

### Erreur SQL : "column does not exist"
- Vérifiez que la migration SQL a été appliquée correctement
- Vérifiez que les tables `ai_chat_conversations` et `ai_chat_messages` existent

## 📊 Structure de l'analyse IA

L'analyse IA est stockée dans le champ `ai_analysis` (JSONB) :

```json
{
  "causes": ["cause 1", "cause 2", "cause 3"],
  "urgency": "urgent" | "moderate" | "low",
  "recommended_service": "Nom du service",
  "service_id": "id_du_service"
}
```

## 🔄 Intégration avec le système de réservation

Le bouton "Réserver un rendez-vous" redirige vers `/reservation?service={service_id}` avec le service recommandé pré-rempli.

## 📱 Compatibilité

- ✅ Mobile (iOS, Android)
- ✅ Tablette
- ✅ Desktop
- ✅ Responsive design

## 🎨 Style

Le chat IA utilise le même style que le reste de l'application CarsLink :
- Bulles de chat (client à gauche, IA à droite)
- Badges d'urgence colorés
- Animations fluides avec Framer Motion
- Design moderne et épuré

