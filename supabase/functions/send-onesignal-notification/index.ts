// supabase/functions/send-onesignal-notification/index.ts
// @ts-ignore: Deno global
declare const Deno: any;

interface OneSignalNotificationRequest {
  usernames?: string[];
  broadcast?: boolean;
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
    console.log('📨 Received OneSignal notification request');
    
    const { 
      usernames,
      broadcast = false,
      title, 
      body, 
      data = {}, 
      channelId = 'default' 
    }: OneSignalNotificationRequest = await req.json();

    console.log(`   Title: ${title}`);
    console.log(`   Broadcast: ${broadcast}`);
    console.log(`   Channel: ${channelId}`);

    // Get OneSignal credentials from environment
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error('❌ OneSignal credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'OneSignal credentials not configured',
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

    // Build OneSignal notification payload
    const notificationPayload: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: body },
      data: data,
      android_channel_id: channelId,
      priority: 10,
      ttl: 86400, // 24 hours
    };

    // Target specific users or broadcast to all
    if (broadcast) {
      console.log('📢 Broadcasting to all subscribed users');
      notificationPayload.included_segments = ['Subscribed Users'];
    } else if (usernames && usernames.length > 0) {
      console.log(`📤 Sending to ${usernames.length} specific users`);
      notificationPayload.include_external_user_ids = usernames;
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Must specify either usernames or broadcast=true',
          success: false 
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

    // Send notification via OneSignal API
    console.log('📡 Calling OneSignal API...');
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();
    
    console.log('OneSignal response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('❌ OneSignal API error:', result);
      return new Response(
        JSON.stringify({ 
          error: result.errors || 'OneSignal API request failed',
          success: false,
          details: result,
        }),
        { 
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    console.log(`✅ Success! Recipients: ${result.recipients || 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        recipients: result.recipients || 0,
        id: result.id,
        message: `Notification sent to ${result.recipients || 0} users`,
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