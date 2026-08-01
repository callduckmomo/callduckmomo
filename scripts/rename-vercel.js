const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';
const OLD_PROJECT = 'callduck';
const NEW_PROJECT = 'duckmomo';

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
  console.log(`Renaming Vercel project from ${OLD_PROJECT} to ${NEW_PROJECT}...`);
  const res = await request('PATCH', `/v9/projects/${OLD_PROJECT}`, {
    name: NEW_PROJECT
  });
  
  if (res.error) {
    console.error('Failed to rename project:', res.error);
  } else {
    console.log('Project renamed successfully! Vercel URL should now be updated to duckmomo.vercel.app');
  }
}

run();
