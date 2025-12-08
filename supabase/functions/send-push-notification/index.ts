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
    console.log('📨 Received push notification request');
    
    const { 
      tokens, 
      title, 
      body, 
      data = {}, 
      channelId = 'default' 
    }: PushNotificationRequest = await req.json();

    console.log(`📤 Tokens count: ${tokens?.length || 0}`);
    console.log(`   Title: ${title}`);
    console.log(`   Channel: ${channelId}`);

    // Validate input
    if (!tokens || tokens.length === 0) {
      console.error('❌ No tokens provided');
      return new Response(
        JSON.stringify({ error: 'No tokens provided', success: false }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Get FCM Service Account from environment
    const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT');
    if (!FCM_SERVICE_ACCOUNT_JSON) {
      console.error('❌ FCM_SERVICE_ACCOUNT not configured in Supabase secrets');
      return new Response(
        JSON.stringify({ 
          error: 'FCM_SERVICE_ACCOUNT not configured. Please set it in Supabase secrets.', 
          success: false 
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    console.log('✅ FCM_SERVICE_ACCOUNT found');

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error('❌ Invalid FCM_SERVICE_ACCOUNT JSON');
      return new Response(
        JSON.stringify({ error: 'Invalid service account JSON', success: false }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Separate tokens by type
    const expoTokens = tokens.filter((token: string) => 
      token && token.startsWith('ExponentPushToken')
    );
    
    const fcmTokens = tokens.filter((token: string) => 
      token && !token.startsWith('ExponentPushToken') && token.includes(':') && token.length > 50
    );

    console.log(`   📱 Expo tokens: ${expoTokens.length}`);
    console.log(`   🔥 FCM tokens: ${fcmTokens.length}`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Send to Expo tokens via Expo service
    if (expoTokens.length > 0) {
      console.log('📨 Sending to Expo tokens...');
      const expoResults = await Promise.allSettled(
        expoTokens.map((token: string) => sendViaExpo(token, title, body, data, channelId))
      );
      
      expoResults.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`Expo token ${i}: ${result.reason?.message || 'Unknown error'}`);
        }
      });
    }

    // Send to FCM tokens via FCM HTTP v1 API
    if (fcmTokens.length > 0) {
      console.log('🔥 Sending to FCM tokens via HTTP v1 API...');
      
      // Get OAuth2 access token
      const accessToken = await getAccessToken(serviceAccount);
      
      const fcmResults = await Promise.allSettled(
        fcmTokens.map((token: string) => 
          sendViaFCMv1(token, title, body, data, channelId, serviceAccount.project_id, accessToken)
        )
      );
      
      fcmResults.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          results.success++;
        } else {
          results.failed++;
          const errorMsg = result.reason?.message || 'Unknown error';
          console.error(`   FCM token ${i}: ${errorMsg}`);
          results.errors.push(`FCM token ${i}: ${errorMsg}`);
        }
      });
    }

    console.log(`✅ Success: ${results.success} notifications sent`);
    
    if (results.failed > 0) {
      console.error(`❌ Failed: ${results.failed} notifications`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.success,
        failed: results.failed,
        total: tokens.length,
        message: `${results.success} sent, ${results.failed} failed`,
        errors: results.errors.length > 0 ? results.errors : undefined
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

// Get OAuth2 Access Token for FCM HTTP v1 API
async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  
  const jwtClaimSetEncoded = btoa(JSON.stringify(jwtClaimSet));
  
  // Create signature (simplified - in production use proper JWT library)
  const signatureInput = `${jwtHeader}.${jwtClaimSetEncoded}`;
  
  // Import private key
  const privateKey = serviceAccount.private_key;
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.substring(
    privateKey.indexOf(pemHeader) + pemHeader.length,
    privateKey.indexOf(pemFooter)
  ).replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );
  
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const jwt = `${signatureInput}.${signatureBase64}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Send notification via Expo service (for Expo tokens)
async function sendViaExpo(
  token: string,
  title: string,
  body: string,
  data: Record<string, any>,
  channelId: string
): Promise<any> {
  console.log(`   📱 Sending to Expo token: ${token.substring(0, 30)}...`);
  
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
      data: data,
      channelId: channelId,
      priority: 'high',
      ttl: 86400,
      badge: 1,
    }),
  });

  const result = await response.json();
  
  if (!response.ok || result.data?.[0]?.status === 'error') {
    throw new Error(result.data?.[0]?.message || 'Expo push failed');
  }

  return result;
}

// Send notification via FCM HTTP v1 API (for FCM tokens)
async function sendViaFCMv1(
  token: string,
  title: string,
  body: string,
  data: Record<string, any>,
  channelId: string,
  projectId: string,
  accessToken: string
): Promise<any> {
  console.log(`   🔥 Sending to FCM token: ${token.substring(0, 30)}...`);
  
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
            channelId: channelId,
          },
          android: {
            priority: 'high',
            notification: {
              channel_id: channelId,
              sound: 'default',
            },
          },
        },
      }),
    }
  );

  const result = await response.json();
  
  console.log(`      ✅ FCM v1 Response: ${JSON.stringify(result)}`);
  
  if (!response.ok) {
    throw new Error(result.error?.message || `FCM request failed: ${response.status}`);
  }

  return result;
}