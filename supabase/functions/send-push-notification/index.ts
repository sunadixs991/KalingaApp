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

    // Filter valid tokens
    const validTokens = tokens.filter((token: string) => 
      token && (token.startsWith('ExponentPushToken') || token.includes(':') && token.length > 50)
    );

    console.log(`   Valid tokens: ${validTokens.length}/${tokens.length}`);

    if (validTokens.length === 0) {
      console.error('❌ No valid tokens after filtering');
      return new Response(
        JSON.stringify({ error: 'No valid tokens provided', success: false, sent: 0, failed: tokens.length }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Send all via Expo service (simplest and most reliable)
    console.log('📨 Sending all tokens via Expo push service...');
    
    const results = await Promise.allSettled(
      validTokens.map(async (token: string) => {
        return await sendViaExpo(token, title, body, data, channelId);
      })
    );

    // Count successes and failures
    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Success: ${successes} notifications sent`);
    
    if (failures > 0) {
      console.error(`❌ Failed: ${failures} notifications`);
      results
        .forEach((r, i) => {
          if (r.status === 'rejected') {
            console.error(`   Token ${i}: ${(r as PromiseRejectedResult).reason?.message || 'Unknown error'}`);
          }
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successes,
        failed: failures,
        total: validTokens.length,
        message: `${successes} sent, ${failures} failed`,
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

// Send notification via Expo service (works for both Expo and FCM tokens)
async function sendViaExpo(
  token: string,
  title: string,
  body: string,
  data: Record<string, any>,
  channelId: string
): Promise<any> {
  console.log(`   📱 Sending to token: ${token.substring(0, 30)}...`);
  
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
      ttl: 86400, // 24 hours
      badge: 1,
    }),
  });

  const result = await response.json();
  
  console.log(`      Response: ${JSON.stringify(result)}`);
  
  if (!response.ok) {
    throw new Error(`Expo push failed: ${response.statusText}`);
  }
  
  if (result.data?.[0]?.status === 'error') {
    throw new Error(result.data?.[0]?.message || 'Expo push returned error status');
  }

  return result;
}