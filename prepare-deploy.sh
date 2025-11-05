#!/bin/bash

# Script d'aide pour préparer le déploiement AWS Amplify
# Ce script vous guide dans la préparation de votre dépôt pour GitHub

echo "🚀 Script de préparation pour AWS Amplify"
echo "=========================================="
echo ""

# Vérifier si on est dans le bon dossier
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le dossier CarsLink"
    echo "   Placez-vous dans: /Users/taytonaday/Desktop/Workplace Flynesis All/CarsLinkApp/CarsLink"
    exit 1
fi

echo "✅ Dossier correct détecté"
echo ""

# Vérifier si Git est initialisé
if [ ! -d ".git" ]; then
    echo "📦 Initialisation de Git..."
    git init
    echo "✅ Git initialisé"
else
    echo "✅ Git déjà initialisé"
fi

echo ""

# Vérifier le statut Git
echo "📊 Statut actuel du dépôt:"
git status --short

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PROCHAINES ÉTAPES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Créez un dépôt sur GitHub:"
echo "   👉 https://github.com/new"
echo "   👉 Nom: carslink"
echo "   👉 Ne cochez PAS 'Initialize with README'"
echo ""
echo "2. Une fois le dépôt créé, exécutez ces commandes:"
echo ""
echo "   git add ."
echo "   git commit -m 'Configuration AWS Amplify'"
echo "   git remote add origin https://github.com/VOTRE_USERNAME/carslink.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Ensuite, allez sur AWS Amplify:"
echo "   👉 https://console.aws.amazon.com/amplify/"
echo "   👉 Suivez le guide dans GUIDE_VISUEL_DEPLOIEMENT.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

