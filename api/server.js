import { createServer } from 'node:http';
import { Firestore } from '@google-cloud/firestore';

const PORT = Number(process.env.PORT) || 8080;
const MAX_BODY_BYTES = 10 * 1024;
const DATA_STORE = process.env.DATA_STORE || 'memory';
const CUSTOMER_ID = process.env.CUSTOMER_ID || 'demo-customer';
const CUSTOMER_COLLECTION = process.env.CUSTOMER_COLLECTION || 'customers';

if (!['memory', 'firestore'].includes(DATA_STORE)) {
  throw new Error('DATA_STORE must be memory or firestore');
}

const firestore = DATA_STORE === 'firestore' ? new Firestore({ databaseId: process.env.FIRESTORE_DB_ID }) : null;
let memoryProfile = {
  name: process.env.CUSTOMER_NAME || 'Taylor Morgan',
  address: process.env.CUSTOMER_ADDRESS || '100 Main Street',
  servicePlan: process.env.SERVICE_PLAN || 'Unlimited 5G Plan',
};

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function validate(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  if (!name || name.length > 100) return { error: 'Name is required (max 100 characters)' };
  if (!address || address.length > 500) return { error: 'Address is required (max 500 characters)' };
  return { value: { name, address } };
}

async function getProfile(customerId = CUSTOMER_ID) {
  if (!firestore) return customerId === CUSTOMER_ID ? memoryProfile : null;

  const snapshot = await firestore.collection(CUSTOMER_COLLECTION).doc(customerId).get();
  return snapshot.exists ? snapshot.data() : null;
}

async function updateProfile(values) {
  if (!firestore) {
    memoryProfile = { ...memoryProfile, ...values, updatedAt: new Date().toISOString() };
    return memoryProfile;
  }

  const customerRef = firestore.collection(CUSTOMER_COLLECTION).doc(CUSTOMER_ID);
  const snapshot = await customerRef.get();
  if (!snapshot.exists) return null;

  const updatedAt = new Date().toISOString();
  await customerRef.update({ ...values, updatedAt });
  return { ...snapshot.data(), ...values, updatedAt };
}

function dialogflowText(text, servicePlan) {
  return {
    fulfillmentResponse: {
      messages: [{ text: { text: [text] } }],
    },
    sessionInfo: { parameters: { servicePlan } },
  };
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/webhook/phone-plan' && req.method === 'POST') {
    const profile = await getProfile();
    if (!profile?.servicePlan) {
      return send(res, 404, dialogflowText('I could not retrieve the service plan right now.', ''));
    }
    return send(res, 200, dialogflowText(`Your service plan is ${profile.servicePlan}.`, profile.servicePlan));
  }

  if (pathname !== '/api/profile') return send(res, 404, { error: 'Not found' });

  if (req.method === 'GET') {
    const profile = await getProfile();
    return profile ? send(res, 200, profile) : send(res, 404, { error: 'Customer not found' });
  }

  if (req.method === 'PUT') {
    if (!req.headers['content-type']?.startsWith('application/json')) {
      return send(res, 415, { error: 'Content-Type must be application/json' });
    }
    try {
      const { value, error } = validate(await readJson(req));
      if (error) return send(res, 400, { error });
      const updated = await updateProfile(value);
      return updated ? send(res, 200, updated) : send(res, 404, { error: 'Customer not found' });
    } catch (err) {
      return send(res, err.message === 'Payload too large' ? 413 : 400, { error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return send(res, 405, { error: 'Method not allowed' });
});

server.listen(PORT, () => console.log(`API listening on port ${PORT}`));
