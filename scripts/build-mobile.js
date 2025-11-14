#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Sauvegarder la config actuelle
const currentConfig = path.join(__dirname, '..', 'next.config.js');
const mobileConfig = path.join(__dirname, '..', 'next.config.mobile.js');
const backupConfig = path.join(__dirname, '..', 'next.config.js.backup');

try {
  // Sauvegarder next.config.js si il existe
  if (fs.existsSync(currentConfig)) {
    fs.copyFileSync(currentConfig, backupConfig);
    console.log('✅ Configuration actuelle sauvegardée');
  }

  // Copier next.config.mobile.js vers next.config.js
  if (fs.existsSync(mobileConfig)) {
    fs.copyFileSync(mobileConfig, currentConfig);
    console.log('✅ Configuration mobile appliquée');
  } else {
    console.error('❌ next.config.mobile.js introuvable');
    process.exit(1);
  }

  // Exécuter le build
  console.log('🔨 Démarrage du build mobile...');
  execSync('next build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  // Copier vers Capacitor
  console.log('📱 Copie vers Capacitor...');
  execSync('npx cap copy', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  console.log('✅ Build mobile terminé avec succès!');
} catch (error) {
  console.error('❌ Erreur lors du build:', error.message);
  
  // Restaurer la config originale en cas d'erreur
  if (fs.existsSync(backupConfig)) {
    fs.copyFileSync(backupConfig, currentConfig);
    fs.unlinkSync(backupConfig);
    console.log('✅ Configuration originale restaurée');
  }
  
  process.exit(1);
} finally {
  // Restaurer la config originale
  if (fs.existsSync(backupConfig)) {
    fs.copyFileSync(backupConfig, currentConfig);
    fs.unlinkSync(backupConfig);
    console.log('✅ Configuration originale restaurée');
  }
}

