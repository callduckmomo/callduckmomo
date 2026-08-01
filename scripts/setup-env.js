// Auto-generated setup script
// Renames .env.main or .env.child to .env before build
// This ensures the correct environment is used for each site

const fs = require('fs');
const path = require('path');

const mainEnv = path.join(__dirname, '..', '.env.main');
const childEnv = path.join(__dirname, '..', '.env.child');
const targetEnv = path.join(__dirname, '..', '.env');

if (fs.existsSync(mainEnv)) {
  fs.copyFileSync(mainEnv, targetEnv);
  console.log('[setup-env] Using .env.main for build');
} else if (fs.existsSync(childEnv)) {
  fs.copyFileSync(childEnv, targetEnv);
  console.log('[setup-env] Using .env.child for build');
} else {
  console.log('[setup-env] No .env.main or .env.child found, using existing .env');
}
