# Configuration de Cursor pour utiliser Ollama EC2

## Configuration automatique via l'interface Cursor

### Étape 1: Ouvrir les paramètres Cursor

1. Ouvrez Cursor
2. Allez dans **Settings** (ou `Cmd/Ctrl + ,`)
3. Cherchez **"Models"** ou **"AI Provider"** dans la barre de recherche

### Étape 2: Ajouter un nouveau provider

1. Cliquez sur **"Add Provider"** ou **"Custom Provider"**
2. Sélectionnez **"OpenAI Compatible API"** ou **"Custom API"**
3. Remplissez les champs suivants:

   - **Name**: `Ollama EC2`
   - **Base URL**: `http://34.238.192.241:11434/v1`
   - **API Key**: `LOCAL-OLLAMA-KEY` (ou n'importe quelle valeur, Ollama n'en a pas besoin)

### Étape 3: Ajouter le modèle

1. Dans la section **Models**, cliquez sur **"Add Model"**
2. Remplissez:
   - **Model ID**: `deepseek-r1:1.5b`
   - **Provider**: Sélectionnez `Ollama EC2`
   - **Max Tokens**: `4096` (ou laissez par défaut)

### Étape 4: Définir comme modèle par défaut

1. Dans **Settings > Models**
2. Pour chaque section, sélectionnez `deepseek-r1:1.5b`:
   - **Chat Model**: `deepseek-r1:1.5b`
   - **Inline Edit Model**: `deepseek-r1:1.5b`
   - **Autocomplete Model**: `deepseek-r1:1.5b` (si disponible)

### Étape 5: Tester la configuration

1. Ouvrez le chat Cursor (`Cmd/Ctrl + L`)
2. Tapez: "Say hello from EC2."
3. Si vous recevez une réponse, la configuration est réussie! ✅

## Configuration manuelle via fichier (si disponible)

Si Cursor utilise un fichier de configuration, vous pouvez créer/modifier:

**Fichier**: `~/.cursor/settings.json` ou `.cursor/settings.json` dans votre workspace

```json
{
  "models": {
    "providers": [
      {
        "name": "Ollama EC2",
        "type": "openai-compatible",
        "baseUrl": "http://34.238.192.241:11434/v1",
        "apiKey": "LOCAL-OLLAMA-KEY"
      }
    ],
    "defaultChatModel": "deepseek-r1:1.5b",
    "defaultInlineEditModel": "deepseek-r1:1.5b",
    "defaultAutocompleteModel": "deepseek-r1:1.5b"
  }
}
```

## Test de connexion

Pour tester que votre serveur Ollama EC2 fonctionne, exécutez:

```bash
# Test simple avec curl
curl http://34.238.192.241:11434/api/tags

# Test de chat
curl http://34.238.192.241:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-r1:1.5b",
    "messages": [
      {"role": "user", "content": "Say hello from EC2."}
    ],
    "stream": false
  }'

# Ou utilisez le script de test
npx tsx scripts/test-ollama-ec2.ts
```

## Dépannage

### Le serveur ne répond pas

1. Vérifiez que le serveur EC2 est démarré
2. Vérifiez que le port 11434 est ouvert dans le Security Group
3. Testez avec `curl http://34.238.192.241:11434/api/tags`

### Le modèle n'est pas trouvé

1. Connectez-vous au serveur EC2: `ssh -i votre-key.pem ubuntu@34.238.192.241`
2. Vérifiez que Ollama est démarré: `sudo systemctl status ollama`
3. Vérifiez les modèles installés: `ollama list`
4. Installez le modèle si nécessaire: `ollama pull deepseek-r1:1.5b`

### Cursor ne peut pas se connecter

1. Vérifiez que l'URL est correcte: `http://34.238.192.241:11434/v1` (notez le `/v1` à la fin)
2. Vérifiez que vous n'êtes pas derrière un VPN qui bloque la connexion
3. Essayez d'accéder à l'URL dans votre navigateur: `http://34.238.192.241:11434/api/tags`

## Notes importantes

- L'URL doit se terminer par `/v1` pour la compatibilité OpenAI
- Ollama n'utilise pas vraiment d'API key, mais certains clients en exigent une (utilisez n'importe quelle valeur)
- Le modèle `deepseek-r1:1.5b` doit être installé sur le serveur EC2

