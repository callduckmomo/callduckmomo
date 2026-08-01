const fs = require('fs');
const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';
const PROJECT_ID = 'premium-by-som';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.vercel.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const envContent = fs.readFileSync('vercel.env', 'utf-8');
  const lines = envContent.split('\n');
  
  const envVars = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx !== -1) {
      const key = line.substring(0, idx).trim();
      let val = line.substring(idx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      envVars.push({ key, value: val });
    }
  }

  console.log(`Parsed ${envVars.length} variables. Uploading...`);

  // First, get project to find its real ID
  const proj = await request('GET', `/v9/projects/${PROJECT_ID}`);
  if (proj.error) {
    console.error("Project fetch error:", proj.error);
    return;
  }
  const realProjectId = proj.id;

  // Clear existing envs to avoid duplicates (optional, but let's just add/update)
  // Actually, Vercel allows creating multiple if we just POST to /v10/projects/:id/env?upsert=true
  for (const ev of envVars) {
    console.log(`Adding ${ev.key}...`);
    await request('POST', `/v10/projects/${realProjectId}/env?upsert=true`, {
      key: ev.key,
      value: ev.value.replace(/\\n/g, '\n'), // Handle newlines in private key
      type: 'encrypted',
      target: ['production', 'preview', 'development']
    });
  }

  console.log("Done!");
}

run().catch(console.error);
