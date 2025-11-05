#!/bin/bash

# Script automatique pour créer le dépôt GitHub et pousser le code
# Ce script va tout faire automatiquement !

echo "🚀 Script Automatique - Création GitHub et Push"
echo "=================================================="
echo ""

# Vérifier si on est dans le bon dossier
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le dossier CarsLink"
    exit 1
fi

# Vérifier si Git est initialisé
if [ ! -d ".git" ]; then
    echo "❌ Git n'est pas initialisé"
    exit 1
fi

# Vérifier si GitHub CLI est installé
if ! command -v gh &> /dev/null; then
    echo "📦 Installation de GitHub CLI..."
    brew install gh
fi

# Vérifier l'authentification GitHub
echo "🔐 Vérification de l'authentification GitHub..."
if ! gh auth status &> /dev/null; then
    echo "⚠️  Vous n'êtes pas connecté à GitHub"
    echo ""
    echo "📝 Authentification GitHub CLI..."
    echo "   Suivez les instructions à l'écran:"
    echo "   1. Choisissez 'GitHub.com'"
    echo "   2. Choisissez 'HTTPS'"
    echo "   3. Authentifiez-vous dans votre navigateur"
    echo ""
    gh auth login
fi

# Récupérer le username GitHub
GITHUB_USER=$(gh api user --jq .login)
echo "✅ Connecté en tant que: $GITHUB_USER"
echo ""

REPO_NAME="carslink"

# Vérifier si le dépôt existe déjà
echo "🔍 Vérification si le dépôt existe déjà..."
if gh repo view "$GITHUB_USER/$REPO_NAME" &> /dev/null; then
    echo "⚠️  Le dépôt $REPO_NAME existe déjà sur GitHub"
    read -p "Voulez-vous utiliser ce dépôt existant? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Opération annulée"
        exit 1
    fi
else
    echo "📦 Création du dépôt GitHub..."
    gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
    
    if [ $? -eq 0 ]; then
        echo "✅ Dépôt créé et code poussé avec succès!"
        echo ""
        echo "🎉 Votre code est maintenant sur GitHub:"
        echo "   https://github.com/$GITHUB_USER/$REPO_NAME"
        echo ""
        echo "📋 Prochaine étape:"
        echo "   1. Allez sur AWS Amplify Console"
        echo "   2. Connectez votre dépôt GitHub: $GITHUB_USER/$REPO_NAME"
        echo "   3. Suivez le guide dans GUIDE_VISUEL_DEPLOIEMENT.md"
        exit 0
    else
        echo "❌ Erreur lors de la création du dépôt"
        exit 1
    fi
fi

# Si le dépôt existe déjà, juste pousser le code
echo "📤 Push du code vers GitHub..."
if git remote get-url origin &> /dev/null; then
    echo "✅ Remote 'origin' déjà configuré"
else
    echo "🔗 Configuration du remote..."
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
fi

git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Code poussé avec succès!"
    echo ""
    echo "🎉 Votre code est maintenant sur GitHub:"
    echo "   https://github.com/$GITHUB_USER/$REPO_NAME"
    echo ""
    echo "📋 Prochaine étape:"
    echo "   1. Allez sur AWS Amplify Console"
    echo "   2. Connectez votre dépôt GitHub: $GITHUB_USER/$REPO_NAME"
    echo "   3. Suivez le guide dans GUIDE_VISUEL_DEPLOIEMENT.md"
else
    echo "❌ Erreur lors du push"
    exit 1
fi

