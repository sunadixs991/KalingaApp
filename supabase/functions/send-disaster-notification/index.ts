// supabase/functions/send-disaster-notification/index.ts
// @ts-ignore: Deno global
declare const Deno: any;

// ==================== INTERFACES ====================

interface DisasterNotificationRequest {
  tokens: string[];
  title: string;
  body: string;
  type: 'earthquake' | 'weather' | 'typhoon' | 'flood' | 'landslide';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
}

// ==================== FIREBASE SERVICE ACCOUNT AUTH ====================

/**
 * Generate FCM Access Token using Service Account JWT
 */
async function generateFCMAccessToken(serviceAccount: any): Promise<string> {
  try {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id,
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
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

    // Import and sign with private key
    const privateKey = serviceAccount.private_key;
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

    const signatureBuffer = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signatureInput)
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
      throw new Error(`Token exchange failed: ${error.substring(0, 200)}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate FCM token: ${msg}`);
  }
}

// ==================== NOTIFICATION CHANNELS ====================

/**
 * Get appropriate notification channel based on disaster type and severity
 */
function getChannelId(type: string, severity?: string): string {
  const severityMap: Record<string, string> = {
    earthquake: severity === 'critical' ? 'earthquake_critical' : 'earthquake',
    weather: severity === 'critical' ? 'weather_critical' : 'weather',
    typhoon: severity === 'critical' ? 'weather_critical' : 'weather',
    flood: 'weather_critical',
    landslide: 'weather_critical',
  };
  
  return severityMap[type] || 'default';
}

/**
 * Get Android priority based on severity
 */
function getPriority(severity?: string): string {
  return severity === 'critical' ? 'high' : 'normal';
}

// ==================== EXPO NOTIFICATIONS ====================

/**
 * Send notification via Expo Push Service
 */
async function sendViaExpo(
  token: string,
  title: string,
  body: string,
  type: string,
  severity: string,
  data: Record<string, any>
): Promise<void> {
  try {
    console.log(`   📱 Expo: ${token.substring(0, 30)}...`);
    
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: title,
        body: body,
        data: {
          ...data,
          type: type,
          severity: severity,
        },
        channelId: getChannelId(type, severity),
        priority: 'high',
        ttl: 86400,
        badge: 1,
      }),
    });

    const result = await response.json();
    
    if (!response.ok || result.data?.[0]?.status === 'error') {
      throw new Error(result.data?.[0]?.message || 'Expo push failed');
    }

    console.log(`      ✅ Sent`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`      ❌ ${msg}`);
    throw error;
  }
}

// ==================== FCM NOTIFICATIONS ====================

/**
 * Send notification via Firebase Cloud Messaging HTTP v1 API
 */
async function sendViaFCM(
  token: string,
  title: string,
  body: string,
  type: string,
  severity: string,
  data: Record<string, any>,
  projectId: string,
  accessToken: string
): Promise<void> {
  try {
    console.log(`   🔥 FCM: ${token.substring(0, 30)}...`);
    
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: token,
            notification: {
              title: title,
              body: body,
            },
            data: {
              ...data,
              type: type,
              severity: severity,
            },
            android: {
              priority: getPriority(severity),
              notification: {
                channel_id: getChannelId(type, severity),
                sound: 'default',
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
              },
            },
          },
        }),
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error?.message || `FCM error: ${response.status}`);
    }

    console.log(`      ✅ Sent`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`      ❌ ${msg}`);
    throw error;
  }
}

// ==================== TOKEN ROUTING ====================

/**
 * Separate tokens by type (Expo vs FCM)
 */
function separateTokens(tokens: string[]): { expoTokens: string[]; fcmTokens: string[] } {
  const expoTokens = tokens.filter(token => 
    token && token.startsWith('ExponentPushToken')
  );
  
  const fcmTokens = tokens.filter(token => 
    token && !token.startsWith('ExponentPushToken')
  );

  return { expoTokens, fcmTokens };
}

// ==================== BATCH SENDING ====================

/**
 * Send notifications in parallel with error handling
 */
async function sendBatch(
  tokens: string[],
  title: string,
  body: string,
  type: string,
  severity: string,
  data: Record<string, any>,
  sendFunction: (token: string) => Promise<void>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const result = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  const results = await Promise.allSettled(
    tokens.map(token => sendFunction(token))
  );

  results.forEach((res, index) => {
    if (res.status === 'fulfilled') {
      result.success++;
    } else {
      result.failed++;
      const errorMsg = res.reason instanceof Error ? res.reason.message : String(res.reason);
      result.errors.push(`Token ${index}: ${errorMsg}`);
    }
  });

  return result;
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req: Request) => {
  // Handle CORS
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
    console.log('🚨 ==========================================');
    console.log('🚨 DISASTER NOTIFICATION REQUEST');
    console.log('🚨 Time:', new Date().toISOString());
    console.log('🚨 ==========================================');

    // Parse request
    const req_data: DisasterNotificationRequest = await req.json();
    const { 
      tokens, 
      title, 
      body, 
      type, 
      severity = 'medium',
      data = {} 
    } = req_data;

    // Log details
    console.log(`📢 Disaster Type: ${type.toUpperCase()}`);
    console.log(`⚠️  Severity: ${severity.toUpperCase()}`);
    console.log(`📱 Recipients: ${tokens?.length || 0}`);
    console.log(`📝 Title: ${title}`);
    console.log(`📝 Body: ${body}`);
    console.log(`📊 Data keys: ${Object.keys(data).join(', ') || 'none'}`);

    // Validate input
    if (!tokens || tokens.length === 0) {
      console.error('❌ No tokens provided');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No tokens provided',
          sent: 0,
          failed: 0,
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Separate tokens by type
    const { expoTokens, fcmTokens } = separateTokens(tokens);
    console.log(`🔀 Token Separation:`);
    console.log(`   📱 Expo: ${expoTokens.length}`);
    console.log(`   🔥 FCM: ${fcmTokens.length}`);

    let totalSuccess = 0;
    let totalFailed = 0;
    let allErrors: string[] = [];

    // Send to Expo tokens
    if (expoTokens.length > 0) {
      console.log('🚨 ==========================================');
      console.log('🚨 SENDING TO EXPO TOKENS');
      console.log('🚨 ==========================================');
      
      const expoResult = await sendBatch(
        expoTokens,
        title,
        body,
        type,
        severity,
        data,
        token => sendViaExpo(token, title, body, type, severity, data)
      );

      totalSuccess += expoResult.success;
      totalFailed += expoResult.failed;
      allErrors = [...allErrors, ...expoResult.errors];

      console.log(`📱 Expo: ${expoResult.success}✅ ${expoResult.failed}❌`);
    }

    // Send to FCM tokens
    if (fcmTokens.length > 0) {
      console.log('🚨 ==========================================');
      console.log('🚨 SENDING TO FCM TOKENS');
      console.log('🚨 ==========================================');
      
      // Get FCM service account
      const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT');
      if (!FCM_SERVICE_ACCOUNT_JSON) {
        throw new Error('FCM_SERVICE_ACCOUNT not configured');
      }

      const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
      console.log(`🔐 Service Account: ${serviceAccount.client_email}`);

      // Generate access token
      console.log('🔑 Generating FCM access token...');
      const accessToken = await generateFCMAccessToken(serviceAccount);
      console.log('✅ Token generated');

      const fcmResult = await sendBatch(
        fcmTokens,
        title,
        body,
        type,
        severity,
        data,
        token => sendViaFCM(token, title, body, type, severity, data, serviceAccount.project_id, accessToken)
      );

      totalSuccess += fcmResult.success;
      totalFailed += fcmResult.failed;
      allErrors = [...allErrors, ...fcmResult.errors];

      console.log(`🔥 FCM: ${fcmResult.success}✅ ${fcmResult.failed}❌`);
    }

    // Final summary
    console.log('🚨 ==========================================');
    console.log('🚨 NOTIFICATION DELIVERY SUMMARY');
    console.log(`   ✅ Total Success: ${totalSuccess}`);
    console.log(`   ❌ Total Failed: ${totalFailed}`);
    console.log(`   📊 Success Rate: ${tokens.length > 0 ? ((totalSuccess / tokens.length) * 100).toFixed(1) : 0}%`);
    console.log('🚨 ==========================================');

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSuccess,
        failed: totalFailed,
        total: tokens.length,
        type: type,
        severity: severity,
        message: `Disaster notification sent. ${totalSuccess}/${tokens.length} delivered.`,
        errors: allErrors.length > 0 ? allErrors : undefined,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack';
    
    console.error('🚨 ==========================================');
    console.error('🚨 ERROR IN DISASTER NOTIFICATION');
    console.error(`❌ Message: ${errorMessage}`);
    console.error(`❌ Stack: ${errorStack}`);
    console.error('🚨 ==========================================');

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        sent: 0,
        failed: 0,
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