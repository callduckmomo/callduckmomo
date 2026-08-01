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
  const proj = await request('GET', `/v9/projects/${PROJECT_ID}`);
  if (proj.error) {
    console.error("Project fetch error:", proj.error);
    return;
  }
  const realProjectId = proj.id;

  const envsToAdd = [
    { key: 'NEXT_PUBLIC_MAIN_SITE_URL', value: 'https://appbymari.com' },
    { key: 'MAIN_SITE_SYNC_SECRET', value: 'premium_sync_secret_999' }
  ];

  for (const ev of envsToAdd) {
    console.log(`Adding ${ev.key}...`);
    await request('POST', `/v10/projects/${realProjectId}/env?upsert=true`, {
      key: ev.key,
      value: ev.value,
      type: 'encrypted',
      target: ['production', 'preview', 'development']
    });
  }

  console.log("Done!");
}

run().catch(console.error);
