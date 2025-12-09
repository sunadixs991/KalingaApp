// services/FCMBackgroundHandler.js
/**
 * FCM Background Message Handler
 * Handles push notifications when app is closed or in background
 */

let messaging = null;

try {
  // Try to import Firebase Messaging
  messaging = require('@react-native-firebase/messaging').default;
  console.log('✅ Firebase Messaging loaded for background handler');
} catch (error) {
  console.log('⚠️ Firebase Messaging not available, background handler skipped');
}

if (messaging) {
  /**
   * Handle FCM messages when app is in background or quit state
   * This runs in a background isolate (separate JS context)
   */
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('🔔 FCM Background Message received:', new Date().toISOString());
    console.log('   Message ID:', remoteMessage.messageId);
    
    try {
      const { notification, data } = remoteMessage;
      
      if (notification) {
        console.log('   📨 Title:', notification.title);
        console.log('   📝 Body:', notification.body);
        console.log('   📦 Data:', JSON.stringify(data));
        
        // Note: You can't directly save to Firestore here in background context
        // The notification will be saved when the app opens
        // But you can store it in AsyncStorage for later processing
        
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const key = `pending_notification_${Date.now()}`;
          await AsyncStorage.setItem(key, JSON.stringify({
            title: notification.title,
            body: notification.body,
            data: data || {},
            receivedAt: new Date().toISOString(),
          }));
          console.log('   ✅ Notification queued for processing:', key);
        } catch (storageError) {
          console.error('   ❌ Failed to queue notification:', storageError.message);
        }
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error in background handler:', error);
      return Promise.resolve();
    }
  });

  /**
   * Handle FCM token refresh
   * Called when the FCM token is updated by Firebase
   */
  messaging().onTokenRefresh(async (fcmToken) => {
    console.log('🔄 FCM Token refreshed:', new Date().toISOString());
    console.log('   New token:', fcmToken.substring(0, 50) + '...');
    
    try {
      // Save new token to AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('pushToken', fcmToken);
      await AsyncStorage.setItem('pushTokenType', 'fcm');
      console.log('   ✅ New token saved to AsyncStorage');
      
      // TODO: Update token in Firestore when app opens
      // We can't reliably do database operations in background context
    } catch (error) {
      console.error('   ❌ Failed to save refreshed token:', error);
    }
  });

  console.log('✅ FCM Background handler registered');
} else {
  console.log('⚠️ FCM Background handler not registered (Firebase Messaging not available)');
}

export default messaging;