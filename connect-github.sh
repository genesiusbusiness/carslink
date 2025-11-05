#!/bin/bash

# Script pour connecter le dépôt local à GitHub
# Utilisation: ./connect-github.sh VOTRE_USERNAME

echo "🔗 Script de connexion à GitHub"
echo "================================"
echo ""

# Vérifier si on est dans le bon dossier
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le dossier CarsLink"
    exit 1
fi

# Vérifier si un argument est fourni
if [ -z "$1" ]; then
    echo "📝 Usage: ./connect-github.sh VOTRE_USERNAME_GITHUB"
    echo ""
    echo "Exemple: ./connect-github.sh taytonaday"
    echo ""
    echo "💡 Si vous n'avez pas encore créé le dépôt sur GitHub:"
    echo "   1. Allez sur https://github.com/new"
    echo "   2. Créez un dépôt nommé 'carslink'"
    echo "   3. NE cochez PAS 'Initialize with README'"
    echo "   4. Exécutez ensuite ce script avec votre username"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME="carslink"

echo "✅ Configuration détectée:"
echo "   Username GitHub: $GITHUB_USERNAME"
echo "   Nom du dépôt: $REPO_NAME"
echo ""

# Vérifier si Git est initialisé
if [ ! -d ".git" ]; then
    echo "❌ Git n'est pas initialisé. Exécutez d'abord: git init"
    exit 1
fi

# Vérifier si remote existe déjà
if git remote get-url origin > /dev/null 2>&1; then
    echo "⚠️  Un remote 'origin' existe déjà:"
    git remote get-url origin
    echo ""
    read -p "Voulez-vous le remplacer? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
        echo "✅ Ancien remote supprimé"
    else
        echo "❌ Opération annulée"
        exit 1
    fi
fi

echo "🔗 Ajout du remote GitHub..."
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

echo "✅ Remote ajouté:"
git remote -v
echo ""

echo "📋 Vérification de la branche..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "🔄 Renommage de la branche '$CURRENT_BRANCH' en 'main'..."
    git branch -M main
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuration terminée!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📤 Pour pousser votre code vers GitHub, exécutez:"
echo ""
echo "   git push -u origin main"
echo ""
echo "💡 Si GitHub vous demande un mot de passe, utilisez un"
echo "   Personal Access Token (pas votre mot de passe GitHub)"
echo ""
echo "   Créez-en un ici: https://github.com/settings/tokens"
echo "   Permissions nécessaires: repo (toutes)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

