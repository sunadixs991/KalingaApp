// supabase/functions/_shared/firebaseConfig.ts
// Shared Firebase configuration

export const firebaseConfig = {
  apiKey: 'AIzaSyAkWUZSGU2v1Iu1tv7tIcqGZ25oh9F7ElE',
  authDomain: 'kalingaapp-799a0.firebaseapp.com',
  projectId: 'kalingaapp-799a0',
  storageBucket: 'kalingaapp-799a0.appspot.com',
  messagingSenderId: '536685997944',
  appId: '1:536685997944:web:59afd120b2f6837f64628d',
};

// Firebase REST API endpoints
export const FIREBASE_API_KEY = firebaseConfig.apiKey;
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIREBASE_DB_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// Helper function to convert Firestore document fields
export function parseFirestoreDocument(doc: any): any {
  const parsed: any = {};
  
  for (const [key, value] of Object.entries(doc.fields || {})) {
    const field: any = value;
    
    if (field.stringValue !== undefined) {
      parsed[key] = field.stringValue;
    } else if (field.doubleValue !== undefined) {
      parsed[key] = field.doubleValue;
    } else if (field.integerValue !== undefined) {
      parsed[key] = parseInt(field.integerValue);
    } else if (field.booleanValue !== undefined) {
      parsed[key] = field.booleanValue;
    } else if (field.timestampValue !== undefined) {
      parsed[key] = new Date(field.timestampValue);
    } else if (field.arrayValue !== undefined) {
      parsed[key] = field.arrayValue.values || [];
    } else if (field.mapValue !== undefined) {
      parsed[key] = parseFirestoreDocument({ fields: field.mapValue.fields });
    }
  }
  
  return parsed;
}

// Helper function to convert data to Firestore format
export function toFirestoreFields(data: Record<string, any>): any {
  const fields: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    } else if (typeof value === 'object') {
      fields[key] = { stringValue: JSON.stringify(value) };
    }
  }
  
  return { fields };
}