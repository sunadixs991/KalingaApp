// supabase/functions/send-push-notification/index.ts
// @ts-ignore: Deno global
declare const Deno: any;

interface PushNotificationRequest {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
}

interface FCMMessage {
  token: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  android?: {
    priority: string;
    notification: {
      channelId: string;
      sound: string;
    };
  };
  apns?: {
    payload: {
      aps: {
        sound: string;
        badge: number;
      };
    };
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
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
    const { 
      tokens, 
      title, 
      body, 
      data = {}, 
      channelId = 'default' 
    }: PushNotificationRequest = await req.json();

    console.log(`📤 Received request to send ${tokens?.length || 0} notifications`);
    console.log(`   Title: ${title}`);
    console.log(`   Channel: ${channelId}`);

    // Validate input
    if (!tokens || tokens.length === 0) {
      console.error('❌ No tokens provided');
      return new Response(
        JSON.stringify({ error: 'No tokens provided' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Filter valid tokens
    const validTokens = tokens.filter((token: string) => 
      token && (token.startsWith('ExponentPushToken') || token.includes(':'))
    );

    console.log(`   Valid tokens: ${validTokens.length}/${tokens.length}`);

    if (validTokens.length === 0) {
      console.error('❌ No valid tokens found');
      return new Response(
        JSON.stringify({ error: 'No valid tokens provided' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Get Firebase service account from environment
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable not set');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    if (!projectId) {
      throw new Error('Firebase project_id not found in service account');
    }

    console.log(`🔐 Using Firebase project: ${projectId}`);

    // Get OAuth2 access token for FCM v1 API
    const accessToken = await getAccessToken(serviceAccount);
    console.log('✅ Got FCM access token');

    console.log(`📨 Sending ${validTokens.length} messages to FCM...`);

    // Send notifications
    const results = await Promise.allSettled(
      validTokens.map(async (token: string) => {
        // Extract FCM token from Expo format
        const fcmToken = extractFCMToken(token);
        
        // For iOS tokens (no FCM token extracted), use Expo's service
        if (!fcmToken) {
          console.log('📱 iOS token detected, using Expo service');
          return await sendViaExpo(token, title, body, data, channelId);
        }

        // For Android tokens, send directly via FCM v1
        console.log('🤖 Android token detected, using FCM v1');
        return await sendViaFCM(
          accessToken,
          projectId,
          fcmToken,
          title,
          body,
          data,
          channelId
        );
      })
    );

    // Count successes and failures
    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Success: ${successes} notifications sent`);
    
    if (failures > 0) {
      console.error(`❌ Failed: ${failures} notifications`);
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => ({
          status: 'error',
          message: (r as PromiseRejectedResult).reason?.message || 'Unknown error',
        }));
      console.error('Errors:', JSON.stringify(errors, null, 2));
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successes,
        failed: failures,
        total: validTokens.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Error in edge function:', errorMessage);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

// Extract FCM token from Expo token format
function extractFCMToken(expoToken: string): string | null {
  console.log('🔍 Extracting token from:', expoToken.substring(0, 50) + '...');
  
  // Expo tokens for Android contain the actual FCM token
  // Format: ExponentPushToken[ACTUAL_FCM_TOKEN]
  if (expoToken.startsWith('ExponentPushToken[')) {
    const extracted = expoToken.slice(18, -1);
    console.log('   Extracted FCM token:', extracted.substring(0, 50) + '...');
    
    // Validate it looks like an FCM token (contains colon and proper length)
    if (extracted.includes(':') && extracted.length > 100) {
      return extracted;
    } else {
      console.log('   ⚠️ Extracted token doesn\'t look valid, treating as iOS');
      return null; // Treat as iOS token
    }
  }
  
  // If it's already a raw FCM token (contains colon)
  if (expoToken.includes(':') && expoToken.length > 100) {
    console.log('   Using raw FCM token');
    return expoToken;
  }
  
  // iOS tokens or unknown format
  console.log('   No FCM token found, treating as iOS');
  return null;
}

// Send notification via FCM HTTP v1 API
async function sendViaFCM(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, any>,
  channelId: string
): Promise<any> {
  // Convert data object to string values (FCM requirement)
  const stringData: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    stringData[key] = String(value);
  }
  stringData.channelId = channelId;

  const message: FCMMessage = {
    token: fcmToken,
    notification: {
      title,
      body,
    },
    data: stringData,
    android: {
      priority: 'high',
      notification: {
        channelId,
        sound: 'default',
      },
    },
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    }
  );

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error?.message || `FCM request failed with status ${response.status}`);
  }

  return result;
}

// Fallback to Expo service for iOS tokens
async function sendViaExpo(
  token: string,
  title: string,
  body: string,
  data: Record<string, any>,
  channelId: string
): Promise<any> {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      channelId,
      priority: 'high',
      badge: 1,
    }),
  });

  const result = await response.json();
  
  if (!response.ok || result.data?.[0]?.status === 'error') {
    throw new Error(result.data?.[0]?.message || 'Expo push failed');
  }

  return result;
}

// Get OAuth2 access token for FCM v1 API
async function getAccessToken(serviceAccount: any): Promise<string> {
  const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];
  
  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  
  // Create JWT claims
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: serviceAccount.client_email,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  
  // Base64url encode header and claims
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const signatureInput = `${encodedHeader}.${encodedClaims}`;
  
  // Import private key for signing
  const privateKey = await importPrivateKey(serviceAccount.private_key);
  
  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  );
  
  // Create final JWT
  const encodedSignature = base64UrlEncode(signature);
  const jwt = `${signatureInput}.${encodedSignature}`;
  
  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

// Import RSA private key from PEM format
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and whitespace
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  // Convert base64 to binary
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  // Import as CryptoKey
  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

// Base64url encode (RFC 4648)
function base64UrlEncode(data: string | ArrayBuffer): string {
  const bytes = typeof data === 'string' 
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);
  
  const base64 = btoa(String.fromCharCode(...bytes));
  
  // Convert to base64url format
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}