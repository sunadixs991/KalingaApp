const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

/**
 * Send push notification to single token
 * Handles both Expo and FCM tokens
 */
exports.sendPushNotification = functions.https.onRequest(
  async (request, response) => {
    const { token, title, body, data, channelId } = request.body;

    try {
      if (!token) {
        return response.status(400).json({ error: 'Token required' });
      }

      console.log('📤 Processing push notification...');
      console.log('   Token:', token.substring(0, 20) + '...');

      const isExpoToken = token.startsWith('ExponentPushToken');
      const isFCMToken = token.includes(':');

      let result;

      if (isExpoToken || !isFCMToken) {
        // Send via Expo push service
        result = await sendExpoNotification(token, title, body, data, channelId);
      } else {
        // Send via Firebase Cloud Messaging
        result = await sendFCMNotification(token, title, body, data, channelId);
      }

      return response.json({ success: true, result });
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return response.status(500).json({ error: error.message });
    }
  }
);

/**
 * Send batch push notifications
 */
exports.sendBatchPushNotifications = functions.https.onRequest(
  async (request, response) => {
    const { tokens, title, body, data, channelId } = request.body;

    try {
      if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
        return response.status(400).json({ error: 'Tokens array required' });
      }

      console.log(`📤 Processing ${tokens.length} push notifications...`);

      // Separate Expo and FCM tokens
      const expoTokens = tokens.filter(t => t.startsWith('ExponentPushToken'));
      const fcmTokens = tokens.filter(t => t.includes(':') && !t.startsWith('ExponentPushToken'));

      console.log(`   📱 ${expoTokens.length} Expo tokens, 🔥 ${fcmTokens.length} FCM tokens`);

      let expoResults = [];
      let fcmResults = [];
      let successCount = 0;
      let failureCount = 0;

      // Send Expo notifications
      if (expoTokens.length > 0) {
        console.log('📱 Sending Expo notifications...');
        expoResults = await sendBatchExpoNotifications(expoTokens, title, body, data, channelId);
        expoResults.forEach(r => {
          if (r.status === 'ok') successCount++;
          else failureCount++;
        });
      }

      // Send FCM notifications
      if (fcmTokens.length > 0) {
        console.log('🔥 Sending FCM notifications...');
        fcmResults = await sendBatchFCMNotifications(fcmTokens, title, body, data, channelId);
        fcmResults.forEach(r => {
          if (r.messageId) successCount++;
          else failureCount++;
        });
      }

      console.log(`✅ Sent: ${successCount} successful, ❌ ${failureCount} failed`);

      return response.json({
        success: true,
        successCount,
        failureCount,
        expoResults,
        fcmResults,
      });
    } catch (error) {
      console.error('❌ Error sending batch notifications:', error);
      return response.status(500).json({ error: error.message });
    }
  }
);

/**
 * Send single Expo notification
 */
async function sendExpoNotification(token, title, body, data, channelId) {
  try {
    const message = {
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
      channelId: channelId || 'default',
      priority: 'high',
    };

    const response = await axios.post('https://exp.host/--/api/v2/push/send', message);

    if (response.data?.data?.[0]?.status === 'error') {
      console.error('❌ Expo error:', response.data.data[0]);
      return { status: 'error', error: response.data.data[0] };
    }

    console.log('✅ Expo notification sent');
    return { status: 'ok' };
  } catch (error) {
    console.error('❌ Expo send error:', error.message);
    return { status: 'error', error: error.message };
  }
}

/**
 * Send single FCM notification
 */
async function sendFCMNotification(token, title, body, data, channelId) {
  try {
    const message = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: channelId || 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
    };

    const result = await admin.messaging().send(message);
    console.log('✅ FCM notification sent:', result);
    return { status: 'ok', messageId: result };
  } catch (error) {
    console.error('❌ FCM send error:', error.message);
    return { status: 'error', error: error.message };
  }
}

/**
 * Send batch Expo notifications
 */
async function sendBatchExpoNotifications(tokens, title, body, data, channelId) {
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title: title,
    body: body,
    data: data || {},
    channelId: channelId || 'default',
    priority: 'high',
  }));

  try {
    const response = await axios.post('https://exp.host/--/api/v2/push/send', messages);
    return response.data?.data || [];
  } catch (error) {
    console.error('❌ Batch Expo error:', error.message);
    return tokens.map(() => ({ status: 'error', error: error.message }));
  }
}

/**
 * Send batch FCM notifications
 */
async function sendBatchFCMNotifications(tokens, title, body, data, channelId) {
  const messages = tokens.map(token => ({
    token: token,
    notification: {
      title: title,
      body: body,
    },
    data: data || {},
    android: {
      priority: 'high',
      notification: {
        channelId: channelId || 'default',
      },
    },
  }));

  try {
    const results = await admin.messaging().sendAll(messages);
    console.log(`📤 Batch sent: ${results.successCount} success, ${results.failureCount} failed`);
    return results.responses;
  } catch (error) {
    console.error('❌ Batch FCM error:', error.message);
    return tokens.map(() => ({ messageId: null, error: error.message }));
  }
}