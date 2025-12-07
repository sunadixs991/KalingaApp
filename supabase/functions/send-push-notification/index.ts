// supabase/functions/send-push-notification/index.ts

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

interface PushNotificationRequest {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
}

interface PushResult {
  status: string;
  message?: string;
  details?: any;
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

    // Create messages for Expo Push Service
    const messages = validTokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: {
        ...data,
        experienceId: '@sunadixs98/Kalinga-App', // Your Expo account + app slug
      },
      channelId: channelId,
      categoryId: channelId,
      priority: 'high',
      badge: 1,
    }));

    console.log(`📨 Sending ${messages.length} messages to Expo Push Service...`);

    // Send to Expo Push Service
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Expo Push Service error:', errorText);
      throw new Error(`Expo Push Service returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Count successes and failures
    const results: PushResult[] = result.data || [];
    const successes = results.filter((r: PushResult) => r.status === 'ok').length;
    const failures = results.filter((r: PushResult) => r.status === 'error').length;

    console.log(`✅ Success: ${successes} notifications sent`);
    if (failures > 0) {
      console.error(`❌ Failed: ${failures} notifications`);
      const errors = results.filter((r: PushResult) => r.status === 'error');
      console.error('Errors:', JSON.stringify(errors, null, 2));
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successes,
        failed: failures,
        total: validTokens.length,
        details: result.data,
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
    // Type-safe error handling
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