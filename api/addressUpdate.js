import { http } from '@google-cloud/functions-framework';
import { Firestore } from '@google-cloud/firestore';
import gPhoneNumber from 'google-libphonenumber';

const firestore = new Firestore();
const phoneUtil = gPhoneNumber.PhoneNumberUtil.getInstance();

// Helper: Validate Name (No numbers allowed)
function validateName(name) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) return false;
  // Regex ensures there are no digits
  return !/\d/.test(name);
}

// Helper: Validate Phone Syntax globally
function validatePhone(phone) {
  try {
    // Expects E.164 format (e.g., +1234567890) or country inference. 
    // For general strict syntax validation, parse and check validity.
    const numberProto = phoneUtil.parseAndKeepRawInput(phone, 'US'); 
    return phoneUtil.isValidNumber(numberProto);
  } catch (error) {
    return false;
  }
}

// Helper: Format phone to E.164 standard for consistent querying
function formatPhone(phone) {
  const numberProto = phoneUtil.parseAndKeepRawInput(phone, 'US');
  return phoneUtil.format(numberProto, gPhoneNumber.PhoneNumberFormat.E164);
}

// Helper: Generate lowercase search prefixes for name similarity (partial match)
function generateNameTrigrams(name) {
  const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '');
  const words = cleanName.split(/\s+/);
  const searchKeywords = new Set();

  // Create simple prefixes/sub-parts for basic similarity search
  words.forEach(word => {
    for (let i = 1; i <= word.length; i++) {
      searchKeywords.add(word.substring(0, i));
    }
  });
  return Array.from(searchKeywords);
}

// Register HTTP Cloud Run Function
http('customerService', async (req, res) => {
  // Set JSON header response
  res.setHeader('Content-Type', 'application/json');

  try {
    // -------------------------------------------------------------
    // POST: Validate and Save Customer
    // -------------------------------------------------------------
    if (req.method === 'POST') {
      const { name, phone, address } = req.body;

      // 1. Validation Logic
      if (!validateName(name)) {
        return res.status(400).send({ error: 'Invalid name. Numbers are not permitted.' });
      }
      if (!validatePhone(phone)) {
        return res.status(400).send({ error: 'Invalid phone number syntax. Provide a valid regional or global format.' });
      }
      if (!address || typeof address !== 'string' || address.trim().length === 0) {
        return res.status(400).send({ error: 'Address is required.' });
      }

      const formattedPhone = formatPhone(phone);
      const searchKeywords = generateNameTrigrams(name);

      // 2. Generate unique Customer ID and Firestore payload
      const customerDocRef = firestore.collection('customers').doc(); 
      const customerId = customerDocRef.id;

      const customerPayload = {
        customerId,
        name: name.trim(),
        phone: formattedPhone,
        address: address.trim(),
        searchKeywords, // Array used for name similarity search
        createdAt: new Date().toISOString()
      };

      await customerDocRef.set(customerPayload);
      return res.status(201).send({ message: 'Customer saved successfully', customerId, customer: customerPayload });
    }

    // -------------------------------------------------------------
    // GET: Search / Retrieve Customer
    // -------------------------------------------------------------
    if (req.method === 'GET') {
      const { customerId, phone, nameQuery } = req.query;
      const customersRef = firestore.collection('customers');
      let results = [];

      // 1. Search by Customer ID
      if (customerId) {
        const doc = await customersRef.doc(customerId).get();
        if (doc.exists) {
          results.push(doc.data());
        }
      } 
      // 2. Search by Phone Number
      else if (phone) {
        if (!validatePhone(phone)) {
          return res.status(400).send({ error: 'Invalid phone syntax provided for search.' });
        }
        const formattedSearchPhone = formatPhone(phone);
        const snapshot = await customersRef.where('phone', '==', formattedSearchPhone).get();
        snapshot.forEach(doc => results.push(doc.data()));
      } 
      // 3. Search by Name Similarity (Prefix search matching keyword trigrams)
      else if (nameQuery) {
        const cleanQuery = nameQuery.toLowerCase().trim();
        const snapshot = await customersRef.where('searchKeywords', 'array-contains', cleanQuery).get();
        snapshot.forEach(doc => results.push(doc.data()));
      } 
      // Fallback if no valid search criteria provided
      else {
        return res.status(400).send({ error: 'Please provide either customerId, phone, or nameQuery parameter.' });
      }

      return res.status(200).send({ count: results.length, data: results });
    }

    // Handle unsupported HTTP methods
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).send({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error('Error handling request:', error);
    return res.status(500).send({ error: 'Internal Server Error', details: error.message });
  }
});