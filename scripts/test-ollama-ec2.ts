/**
 * Script de test pour vérifier la connexion à Ollama EC2
 * Usage: npx tsx scripts/test-ollama-ec2.ts
 */

const OLLAMA_URL = 'http://34.238.192.241:11434';
const MODEL = 'deepseek-r1:1.5b';

async function testOllamaConnection() {
  console.log('🔄 Test de connexion à Ollama EC2...');
  console.log(`📍 URL: ${OLLAMA_URL}`);
  console.log(`🤖 Modèle: ${MODEL}\n`);

  try {
    // Test 1: Vérifier que le serveur répond
    console.log('1️⃣ Test de ping du serveur...');
    const pingResponse = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: 'GET',
    });

    if (!pingResponse.ok) {
      throw new Error(`Serveur non accessible: ${pingResponse.status} ${pingResponse.statusText}`);
    }

    const tags = await pingResponse.json();
    console.log('✅ Serveur accessible');
    console.log(`   Modèles disponibles: ${tags.models?.map((m: any) => m.name).join(', ') || 'Aucun'}\n`);

    // Test 2: Envoyer une requête de chat
    console.log('2️⃣ Test d\'envoi de message...');
    const chatResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [
          {
            role: 'user',
            content: 'Say hello from EC2.',
          },
        ],
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      throw new Error(`Erreur API: ${chatResponse.status} ${chatResponse.statusText}\n${errorText}`);
    }

    const chatData = await chatResponse.json();
    const content = chatData.message?.content || chatData.content || 'Pas de contenu';

    console.log('✅ Message envoyé avec succès');
    console.log(`📝 Réponse reçue: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"\n`);

    console.log('✔️ Ollama EC2 model configured successfully!');
    console.log('\n📊 Résumé:');
    console.log(`   - URL: ${OLLAMA_URL}`);
    console.log(`   - Modèle: ${MODEL}`);
    console.log(`   - Statut: ✅ Opérationnel`);

    return true;
  } catch (error: any) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error('\n🔍 Vérifications à faire:');
    console.error('   1. Le serveur EC2 est-il accessible depuis votre machine?');
    console.error('   2. Le port 11434 est-il ouvert dans le security group?');
    console.error('   3. Ollama est-il démarré sur le serveur?');
    console.error('   4. Le modèle deepseek-r1:1.5b est-il installé? (ollama pull deepseek-r1:1.5b)');
    return false;
  }
}

// Exécuter le test
testOllamaConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

