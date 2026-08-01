const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';
const PROJECT = 'duckmomo';
const DOMAIN = 'duckmomo.vercel.app';

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
  console.log(`Adding domain ${DOMAIN} to project ${PROJECT}...`);
  const res = await request('POST', `/v10/projects/${PROJECT}/domains`, {
    name: DOMAIN
  });
  
  if (res.error) {
    console.error('Failed to add domain:', res.error);
  } else {
    console.log('Domain added successfully!', res);
  }
}

run();
