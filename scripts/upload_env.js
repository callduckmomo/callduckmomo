const fs = require('fs');
const { execSync } = require('child_process');

const envFile = fs.readFileSync('.env.main', 'utf-8');
const lines = envFile.split('\n');

const token = process.env.VERCEL_TOKEN || "";

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      
      // Remove surrounding quotes if they exist
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      console.log(`Adding ${key}...`);
      try {
        // Use echo to pipe the value into vercel env add to handle newlines and special characters securely
        // Using only production and preview to avoid sensitive variable errors on development env
        execSync(`npx vercel env add ${key} production,preview --token=${token} --yes`, {
          input: value,
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (err) {
        console.error(`Failed to add ${key}:`, err.message);
        if (err.stdout) console.error("STDOUT:", err.stdout.toString());
        if (err.stderr) console.error("STDERR:", err.stderr.toString());
      }
    }
  }
}
console.log("Done adding env variables.");
