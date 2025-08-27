import * as Notifications from 'expo-notifications';
import * as SMS from 'expo-sms';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// In-app notification function
export const sendInAppNotification = async (title, body, data = {}) => {
  try {
    // Get all users from Firestore (you might want to filter this based on criteria)
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users = [];
    usersSnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });

    // Send notification to each user
    for (const user of users) {
      if (user.expoPushToken) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
          },
          trigger: null, // null means send immediately
        });

        // Store notification in Firestore for history
        await addDoc(collection(db, "notifications"), {
          userId: user.id,
          title,
          body,
          data,
          createdAt: new Date(),
          read: false
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending in-app notification:', error);
    return false;
  }
};

// SMS notification function
export const sendSMSNotification = async (message, phoneNumbers = []) => {
  try {
    // Check if SMS is available
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('SMS is not available on this device');
    }

    // If no phone numbers provided, get all users' phone numbers from Firestore
    if (phoneNumbers.length === 0) {
      const usersSnapshot = await getDocs(collection(db, "users"));
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.phoneNumber) {
          phoneNumbers.push(userData.phoneNumber);
        }
      });
    }

    // Send SMS
    const { result } = await SMS.sendSMSAsync(
      phoneNumbers,
      message
    );

    // Log the notification
    await addDoc(collection(db, "smsNotifications"), {
      message,
      recipients: phoneNumbers,
      sentAt: new Date(),
      status: result
    });

    return result === 'sent';
  } catch (error) {
    console.error('Error sending SMS notification:', error);
    return false;
  }
};

// Usage example:
// Send both notifications
export const notifyUsers = async (title, message, phoneNumbers = []) => {
  try {
    // Send in-app notification
    const inAppResult = await sendInAppNotification(title, message);
    
    // Send SMS notification
    const smsResult = await sendSMSNotification(message, phoneNumbers);

    return {
      inAppSuccess: inAppResult,
      smsSuccess: smsResult
    };
  } catch (error) {
    console.error('Error in notifyUsers:', error);
    return {
      inAppSuccess: false,
      smsSuccess: false,
      error: error.message
    };
  }
};