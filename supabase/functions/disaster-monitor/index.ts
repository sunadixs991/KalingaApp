// supabase/functions/disaster-monitor/index.ts
// @ts-ignore: Deno global
declare const Deno: any;

// ==================== FIREBASE CONFIG ====================

const FIREBASE_PROJECT_ID = 'kalingaapp-799a0';

function parseFirestoreDocument(doc: any): any {
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

function toFirestoreFields(data: Record<string, any>): any {
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

// ==================== CONFIGURATION ====================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const PUSH_NOTIFICATION_URL = `${SUPABASE_URL}/functions/v1/send-push-notification`;

const OPENWEATHER_API_KEY = '12683fc5064bb784e039481ab14a0d11';
const EMSC_API = 'https://www.seismicportal.eu/fdsnws/event/1/query';
const USGS_API = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const WEATHER_API = 'https://api.openweathermap.org/data/2.5/weather';

const EARTHQUAKE_MIN_MAGNITUDE = 3.0;
const EARTHQUAKE_RADIUS_KM = 250;
const EARTHQUAKE_LOOKBACK_MINUTES = 10;

// ==================== INTERFACES ====================

interface UserLocation {
  username: string;
  token: string;
  latitude: number;
  longitude: number;
  platform: string;
}

interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  latitude: number;
  longitude: number;
  depth: number;
  time: Date;
  url: string;
}

// ==================== FIREBASE SERVICE ACCOUNT AUTH ====================

/**
 * Generate JWT token for Firebase Service Account
 */
async function generateFirebaseToken(): Promise<string | null> {
  try {
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    
    if (!serviceAccountJson) {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT not set');
      return null;
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Create JWT header and payload
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id,
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    // Encode header and payload
    const headerEncoded = btoa(JSON.stringify(header))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const payloadEncoded = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const signatureInput = `${headerEncoded}.${payloadEncoded}`;

    // Use Web Crypto API for signing
    const privateKey = serviceAccount.private_key;
    const encoder = new TextEncoder();
    
    // Import the private key
    const keyData = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\n/g, '');
    
    const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    // Sign the message
    const signatureBuffer = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(signatureInput)
    );

    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signatureEncoded = btoa(String.fromCharCode(...signatureArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const jwt = `${signatureInput}.${signatureEncoded}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('❌ Token exchange failed:', error.substring(0, 200));
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;

  } catch (error) {
    console.error('❌ Error generating Firebase token:', error);
    return null;
  }
}

// ==================== FIREBASE OPERATIONS ====================

/**
 * Fetch user locations from Firebase using Service Account auth
 */
async function fetchUserLocations(): Promise<UserLocation[]> {
  try {
    console.log('🔍 Fetching user locations from Firebase...');
    
    const token = await generateFirebaseToken();
    if (!token) {
      console.error('❌ Failed to get access token');
      return [];
    }

    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pushTokens`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    });

    console.log('   Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Firebase error:', errorText.substring(0, 300));
      return [];
    }

    const data = await response.json();
    const users: UserLocation[] = [];

    if (data.documents) {
      for (const doc of data.documents) {
        const parsed = parseFirestoreDocument(doc);
        
        if (parsed.token && 
            parsed.latitude !== undefined && 
            parsed.longitude !== undefined) {
          users.push({
            username: parsed.username || 'unknown',
            token: parsed.token,
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            platform: parsed.platform || 'unknown',
          });
        }
      }
    }

    console.log(`✅ Fetched ${users.length} users with locations`);
    return users;

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return [];
  }
}

/**
 * Save disaster event using Service Account auth
 */
async function saveDisasterEvent(type: string, eventId: string, data: any): Promise<boolean> {
  try {
    const token = await generateFirebaseToken();
    if (!token) return false;

    // Check if exists
    const checkUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/disasterEvents`;
    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (checkResponse.ok) {
      const existing = await checkResponse.json();
      if (existing.documents) {
        for (const doc of existing.documents) {
          const parsed = parseFirestoreDocument(doc);
          if (parsed.eventId === eventId) {
            console.log(`   ⚠️  Event ${eventId} already processed`);
            return false;
          }
        }
      }
    }

    // Save new event
    const saveUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/disasterEvents`;
    const payload = toFirestoreFields({
      type,
      eventId,
      data: JSON.stringify(data),
      timestamp: new Date(),
    });

    const saveResponse = await fetch(saveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    return saveResponse.ok;
  } catch (error) {
    console.error('❌ Error saving disaster event:', error);
    return false;
  }
}

/**
 * Save notification history using Service Account auth
 */
async function saveNotificationHistory(username: string, title: string, body: string, data: any) {
  try {
    const token = await generateFirebaseToken();
    if (!token) return;

    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/notifications`;
    const payload = toFirestoreFields({
      username,
      title,
      body,
      data: JSON.stringify(data),
      type: data.type || 'general',
      isPublic: true,
      read: false,
      createdAt: new Date(),
    });

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('❌ Error saving notification:', error);
  }
}

// ==================== UTILITIES ====================

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function getEarthquakeSeverity(mag: number): string {
  if (mag >= 7.0) return 'MAJOR EARTHQUAKE - Seek immediate shelter!';
  if (mag >= 6.0) return 'Strong earthquake - Stay alert!';
  if (mag >= 5.0) return 'Moderate earthquake - Take precautions.';
  if (mag >= 4.0) return 'Light earthquake detected.';
  return 'Minor earthquake detected.';
}

// ==================== EARTHQUAKE MONITORING ====================

async function fetchEMSCEarthquakes(): Promise<Earthquake[]> {
  try {
    const startTime = new Date(Date.now() - EARTHQUAKE_LOOKBACK_MINUTES * 60 * 1000).toISOString();
    const url = `${EMSC_API}?format=json&minmag=${EARTHQUAKE_MIN_MAGNITUDE}&orderby=time&limit=50&starttime=${startTime}`;
    
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`EMSC error: ${response.status}`);

    const data = await response.json();
    if (!data.features?.length) return [];

    return data.features.map((f: any) => ({
      id: f.id || `emsc_${f.properties.time}_${Math.random()}`,
      magnitude: parseFloat(f.properties.mag) || 0,
      place: f.properties.flynn_region || f.properties.place || 'Unknown',
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
      depth: f.geometry.coordinates[2] || 0,
      time: new Date(f.properties.time),
      url: `https://www.emsc-csem.org/Earthquake/earthquake.php?id=${f.id}`,
    })).filter(eq => eq.magnitude > 0);
  } catch (error) {
    console.error('❌ EMSC error:', error);
    throw error;
  }
}

async function checkEarthquakes(users: UserLocation[]): Promise<number> {
  try {
    console.log('🌍 Checking earthquakes...');
    
    const earthquakes = await fetchEMSCEarthquakes();
    console.log(`   Found ${earthquakes.length} recent quakes`);

    if (!earthquakes.length) return 0;

    let sent = 0;

    for (const quake of earthquakes) {
      const isNew = await saveDisasterEvent('earthquake', quake.id, {
        magnitude: quake.magnitude,
        place: quake.place,
        time: quake.time.toISOString(),
      });

      if (!isNew) continue;

      console.log(`   🚨 NEW: ${quake.magnitude.toFixed(1)} - ${quake.place}`);

      const affected = users.filter(u => 
        calculateDistance(u.latitude, u.longitude, quake.latitude, quake.longitude) <= EARTHQUAKE_RADIUS_KM
      );

      if (!affected.length) {
        console.log(`      No users within ${EARTHQUAKE_RADIUS_KM}km`);
        continue;
      }

      console.log(`      📍 ${affected.length} users affected`);

      const severity = getEarthquakeSeverity(quake.magnitude);
      const title = `🚨 Earthquake Alert - Magnitude ${quake.magnitude.toFixed(1)}`;
      const body = `${quake.place}. ${severity}`;

      try {
        const res = await fetch(PUSH_NOTIFICATION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            tokens: affected.map(u => u.token),
            title,
            body,
            data: {
              type: 'earthquake',
              magnitude: quake.magnitude,
              location: quake.place,
              quakeId: quake.id,
            },
            channelId: quake.magnitude >= 7.0 ? 'earthquake_critical' : 'earthquake',
          }),
        });

        const result = await res.json();
        console.log(`      ✅ Sent: ${result.sent || 0}`);
        sent += result.sent || 0;

        await saveNotificationHistory('all', title, body, {
          type: 'earthquake',
          magnitude: quake.magnitude,
          location: quake.place,
        });
      } catch (err) {
        console.error(`      ❌ Send failed:`, err);
      }
    }

    return sent;
  } catch (error) {
    console.error('❌ Check failed:', error);
    return 0;
  }
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    console.log('🔍 ==========================================');
    console.log('🔍 DISASTER MONITOR STARTED');
    console.log('🔍 Time:', new Date().toISOString());
    console.log('🔍 ==========================================');

    const users = await fetchUserLocations();

    if (!users.length) {
      console.log('⚠️  No users found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No users to monitor',
        usersMonitored: 0,
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`👥 Monitoring ${users.length} users`);

    const earthquakeCount = await checkEarthquakes(users);

    console.log('✅ COMPLETED');
    console.log(`   📤 Notifications: ${earthquakeCount}`);
    console.log('🔍 ==========================================');

    return new Response(JSON.stringify({
      success: true,
      message: `Sent ${earthquakeCount} notifications`,
      earthquakeNotifications: earthquakeCount,
      usersMonitored: users.length,
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ ERROR:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});