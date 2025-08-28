import * as SMS from 'expo-sms';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { TWILIO_CONFIG } from '../config/twilio';
import { Alert, Platform } from 'react-native';

// Option 1: Using Expo SMS (for device-based SMS)
export const sendDeviceSMS = async (message, phoneNumbers = []) => {
  try {
    // Check if SMS is available
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('SMS is not available on this device');
    }

    // Get phone numbers from Firestore if none provided
    if (phoneNumbers.length === 0) {
      const usersSnapshot = await getDocs(collection(db, "users"));
      phoneNumbers = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.phone && userData.phone.trim()) {
          phoneNumbers.push(formatPhoneNumber(userData.phone));
        }
      });
    } else {
      phoneNumbers = phoneNumbers.map(formatPhoneNumber);
    }

    if (phoneNumbers.length === 0) {
      throw new Error('No valid phone numbers found');
    }

    // Validate phone numbers
    const validNumbers = phoneNumbers.filter(validatePhoneNumber);
    if (validNumbers.length === 0) {
      throw new Error('No valid phone numbers after validation');
    }

    console.log('Sending device SMS to:', validNumbers);

    // Send SMS using device's SMS functionality
    const { result } = await SMS.sendSMSAsync(validNumbers, message);
    
    // Log to Firestore
    await addDoc(collection(db, "smsNotifications"), {
      phoneNumbers: validNumbers,
      message,
      status: result,
      sentAt: new Date(),
      method: 'device'
    });

    // Show user feedback
    if (result === 'sent') {
      Alert.alert('Success', `SMS sent to ${validNumbers.length} recipients`);
    } else {
      Alert.alert('SMS Status', `SMS status: ${result}`);
    }

    return {
      success: result === 'sent' || result === 'unknown', // 'unknown' is still considered success
      method: 'device',
      phoneNumbers: validNumbers,
      status: result
    };

  } catch (error) {
    console.error('Device SMS error:', error);
    Alert.alert('SMS Error', error.message);
    return {
      success: false,
      error: error.message,
      method: 'device'
    };
  }
};

// Option 2: Using Twilio REST API (server-based SMS)
export const sendTwilioSMS = async (message, phoneNumbers = []) => {
  try {
    // Get phone numbers from Firestore if none provided
    if (phoneNumbers.length === 0) {
      const usersSnapshot = await getDocs(collection(db, "users"));
      phoneNumbers = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.phone) {
          const formattedNumber = formatPhoneNumber(userData.phone);
          if (formattedNumber) {
            phoneNumbers.push(formattedNumber);
            console.log(`Successfully formatted number: ${formattedNumber}`);
          }
        }
      });
    } else {
      phoneNumbers = phoneNumbers
        .map(formatPhoneNumber)
        .filter(number => number !== null);
    }

    if (phoneNumbers.length === 0) {
      throw new Error('No valid phone numbers after formatting');
    }

    console.log('Formatted numbers to send:', phoneNumbers);

    // Send SMS to each phone number using Twilio REST API
    const results = await Promise.all(
      phoneNumbers.map(async (phoneNumber) => {
        try {
          // Use btoa for better browser compatibility
          const authHeader = btoa(
            `${TWILIO_CONFIG.ACCOUNT_SID}:${TWILIO_CONFIG.AUTH_TOKEN}`
          );

          const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authHeader}`,
              },
              body: `To=${encodeURIComponent(phoneNumber)}&From=${encodeURIComponent(TWILIO_CONFIG.PHONE_NUMBER)}&Body=${encodeURIComponent(message)}`,
            }
          );

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Failed to send SMS');
          }

          // Log to Firestore
          await addDoc(collection(db, "smsNotifications"), {
            phoneNumber,
            message,
            status: data.status,
            sid: data.sid,
            sentAt: new Date(),
            method: 'twilio'
          });

          return {
            phoneNumber,
            status: data.status || 'sent',
            sid: data.sid
          };
        } catch (error) {
          console.error(`Failed to send SMS to ${phoneNumber}:`, error);
          return {
            phoneNumber,
            status: 'failed',
            error: error.message
          };
        }
      })
    );

    return {
      success: true,
      results,
      method: 'twilio'
    };

  } catch (error) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Option 3: Using a cloud function (recommended for production)
export const sendCloudFunctionSMS = async (message, phoneNumbers = []) => {
  try {
    // Replace with your cloud function URL
    const cloudFunctionUrl = 'https://your-cloud-function-url.com/sendSMS';
    
    const response = await fetch(cloudFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        phoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : null
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send SMS');
    }

    return result;

  } catch (error) {
    console.error('Cloud function SMS error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Main notification function - API-only (no device SMS)
export const notifyUsers = async (message, phoneNumbers = [], preferredMethod = 'twilio') => {
  try {
    let result;
    let method = preferredMethod;
    
    // Force API-only methods (never use device SMS)
    if (method === 'auto') {
      method = 'twilio'; // Default to Twilio API
    }
    
    console.log(`Using SMS method: ${method}`);
    
    switch (method) {
      case 'cloud':
        result = await sendCloudFunctionSMS(message, phoneNumbers);
        // Fallback to Twilio if cloud function fails
        if (!result.success) {
          console.log('Cloud function failed, falling back to Twilio...');
          result = await sendTwilioSMS(message, phoneNumbers);
        }
        break;
      case 'twilio':
      default:
        result = await sendTwilioSMS(message, phoneNumbers);
        break;
    }

    return result;
  } catch (error) {
    console.error('Error in notifyUsers:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Utility function to validate phone numbers
export const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') return false;
  
  // Remove any non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Basic validation for international phone numbers
  // Must start with + and have 7-15 digits after country code
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  return phoneRegex.test(cleaned);
};

// Function to format phone numbers
export const formatPhoneNumber = (phoneNumber) => {
  try {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // For Philippine numbers starting with 0
    if (cleaned.startsWith('0')) {
      cleaned = '63' + cleaned.substring(1); // Remove 0 and add 63
    }
    
    // For numbers without country code (assuming PH)
    if (cleaned.length === 10) {
      cleaned = '63' + cleaned;
    }
    
    // For numbers already with 63
    if (cleaned.startsWith('63') && cleaned.length === 12) {
      // Format is correct, just add +
      cleaned = '+' + cleaned;
    }

    // Validate final format
    if (!/^\+63\d{10}$/.test(cleaned)) {
      console.log(`Formatted number for validation: ${cleaned}`);
      throw new Error(`Invalid phone number format: ${phoneNumber}`);
    }

    return cleaned;
  } catch (error) {
    console.error(`Phone formatting error for ${phoneNumber}:`, error.message);
    return null;
  }
};

// Function to get all user phone numbers from Firestore
export const getAllPhoneNumbers = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const phoneNumbers = [];
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.phone && userData.phone.trim()) {
        const formatted = formatPhoneNumber(userData.phone);
        if (validatePhoneNumber(formatted)) {
          phoneNumbers.push(formatted);
        } else {
          console.warn(`Skipping invalid phone number: ${userData.phone} -> ${formatted}`);
        }
      }
    });
    
    console.log(`Found ${phoneNumbers.length} valid phone numbers`);
    return phoneNumbers;
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return [];
  }
};

// Utility function to test phone number formatting
export const testPhoneFormatting = (phoneNumber) => {
  console.log('Testing phone number:', phoneNumber);
  const formatted = formatPhoneNumber(phoneNumber);
  const isValid = validatePhoneNumber(formatted);
  console.log(`Formatted: ${formatted}, Valid: ${isValid}`);
  return { formatted, isValid };
};