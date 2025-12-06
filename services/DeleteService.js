// services/DeleteService.js - Automatic Deletion Service
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';

const AUTO_DELETE_TASK = 'AUTO_DELETE_TASK';
const CHECK_INTERVAL_MINUTES = 60; // Run every 1 hour
const LAST_CLEANUP_KEY = 'last_cleanup_timestamp';

/**
 * 1️⃣ Delete expired food schedules (24 hours after schedule datetime)
 * Deletes from both Supabase and Firebase
 */
/**
 * 1️⃣ Delete expired food schedules (24 hours after schedule datetime)
 * Deletes from both Supabase and Firebase
 * ✅ FIXED: Proper timezone handling to avoid "Date value out of bounds" error
 */
async function deleteExpiredSchedules() {
  try {
    console.log('🗑️ Checking for expired schedules...');
    
    const now = new Date();
    let deletedCount = 0;

    // === DELETE FROM SUPABASE ===
    try {
      const { data: supabaseSchedules, error: supabaseError } = await supabase
        .from('food_schedules')
        .select('*');

      if (supabaseError) {
        console.error('   ❌ Supabase query error:', supabaseError);
        throw supabaseError;
      }

      console.log(`   📋 Found ${supabaseSchedules?.length || 0} schedules in Supabase`);

      for (const schedule of supabaseSchedules || []) {
        try {
          if (!schedule.date || !schedule.time) {
            console.log(`   ⚠️ Schedule ${schedule.id} missing date or time`);
            continue;
          }

          // ✅ FIX: Parse date and time components separately
          const dateStr = schedule.date.split('T')[0]; // Get just "2025-12-06"
          let timeStr = schedule.time.trim();
          
          // Parse time - handle both 12h and 24h formats
          let hour = 0;
          let minute = 0;
          
          if (timeStr.includes('AM') || timeStr.includes('PM')) {
            // 12-hour format (e.g., "12:20 AM", "4:30 PM")
            const [time, period] = timeStr.split(' ');
            const [h, m] = time.split(':').map(s => parseInt(s));
            
            hour = h;
            minute = m || 0;
            
            // Convert to 24-hour
            if (period === 'PM' && hour !== 12) {
              hour += 12;
            } else if (period === 'AM' && hour === 12) {
              hour = 0;
            }
          } else {
            // 24-hour format (e.g., "14:30", "03:45")
            const [h, m] = timeStr.split(':').map(s => parseInt(s));
            hour = h;
            minute = m || 0;
          }
          
          // ✅ FIX: Create date using Date constructor with separate components
          // This avoids timezone issues with ISO string parsing
          const [year, month, day] = dateStr.split('-').map(s => parseInt(s));
          const scheduleDateTime = new Date(year, month - 1, day, hour, minute, 0, 0);
          
          // Validate the date
          if (isNaN(scheduleDateTime.getTime())) {
            console.log(`   ⚠️ Invalid datetime for schedule: ${schedule.title}`);
            console.log(`      Date: ${dateStr}, Time: ${timeStr}`);
            continue;
          }
          
          console.log(`   🔍 Schedule "${schedule.title}": ${dateStr} ${timeStr}`);
          console.log(`      Parsed datetime: ${scheduleDateTime.toISOString()}`);
          
          // Add 24 hours to schedule datetime
          const expiryDateTime = new Date(scheduleDateTime.getTime() + 24 * 60 * 60 * 1000);
          
          console.log(`      Expiry datetime: ${expiryDateTime.toISOString()}`);
          console.log(`      Current time: ${now.toISOString()}`);
          console.log(`      Should delete: ${now >= expiryDateTime}`);
          
          // If current time is past expiry time, delete it
          if (now >= expiryDateTime) {
            const { error: deleteError } = await supabase
              .from('food_schedules')
              .delete()
              .eq('id', schedule.id);

            if (!deleteError) {
              console.log(`   ✅ Deleted Supabase schedule: ${schedule.title} (${schedule.date} ${schedule.time})`);
              deletedCount++;
            } else {
              console.error(`   ❌ Failed to delete schedule ${schedule.id}:`, deleteError);
            }
          } else {
            const hoursUntilExpiry = Math.round((expiryDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));
            console.log(`   ⏳ Schedule "${schedule.title}" expires in ${hoursUntilExpiry} hours`);
          }
        } catch (scheduleError) {
          console.error(`   ❌ Error processing schedule ${schedule.id}:`, scheduleError.message);
        }
      }
    } catch (supabaseErr) {
      console.error('   ❌ Supabase schedule deletion error:', supabaseErr);
    }

    // === DELETE FROM FIREBASE ===
    try {
      const firebaseSchedulesSnap = await getDocs(collection(db, 'food_schedules'));
      console.log(`   📋 Found ${firebaseSchedulesSnap.size} schedules in Firebase`);
      
      for (const scheduleDoc of firebaseSchedulesSnap.docs) {
        try {
          const schedule = scheduleDoc.data();
          
          if (!schedule.date || !schedule.time) {
            console.log(`   ⚠️ Firebase schedule ${scheduleDoc.id} missing date or time`);
            continue;
          }

          // ✅ FIX: Parse Firebase date string properly
          // Firebase date format: "December 6, 2025"
          let scheduleDateTime;
          
          // Parse date string like "December 6, 2025"
          const dateMatch = schedule.date.match(/(\w+)\s+(\d+),\s+(\d+)/);
          if (dateMatch) {
            const [, monthName, day, year] = dateMatch;
            const monthMap = {
              'January': 0, 'February': 1, 'March': 2, 'April': 3,
              'May': 4, 'June': 5, 'July': 6, 'August': 7,
              'September': 8, 'October': 9, 'November': 10, 'December': 11
            };
            const month = monthMap[monthName];
            
            // Parse time
            const timeStr = schedule.time.trim();
            let hour = 0;
            let minute = 0;
            
            if (timeStr.includes('AM') || timeStr.includes('PM')) {
              const [time, period] = timeStr.split(' ');
              const [h, m] = time.split(':').map(s => parseInt(s));
              hour = h;
              minute = m || 0;
              
              if (period === 'PM' && hour !== 12) hour += 12;
              if (period === 'AM' && hour === 12) hour = 0;
            } else {
              const [h, m] = timeStr.split(':').map(s => parseInt(s));
              hour = h;
              minute = m || 0;
            }
            
            // Create date with components
            scheduleDateTime = new Date(parseInt(year), month, parseInt(day), hour, minute, 0, 0);
          }
          
          if (!scheduleDateTime || isNaN(scheduleDateTime.getTime())) {
            console.log(`   ⚠️ Could not parse Firebase schedule datetime`);
            console.log(`      Date: ${schedule.date}, Time: ${schedule.time}`);
            continue;
          }
          
          console.log(`   🔍 Firebase schedule "${schedule.title}": ${schedule.date} ${schedule.time}`);
          console.log(`      Parsed datetime: ${scheduleDateTime.toISOString()}`);
          
          // Add 24 hours to schedule datetime
          const expiryDateTime = new Date(scheduleDateTime.getTime() + 24 * 60 * 60 * 1000);
          
          console.log(`      Expiry: ${expiryDateTime.toISOString()}, Should delete: ${now >= expiryDateTime}`);
          
          // If current time is past expiry time, delete it
          if (now >= expiryDateTime) {
            await deleteDoc(doc(db, 'food_schedules', scheduleDoc.id));
            console.log(`   ✅ Deleted Firebase schedule: ${schedule.title}`);
            deletedCount++;
          } else {
            const hoursUntilExpiry = Math.round((expiryDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));
            console.log(`   ⏳ Schedule expires in ${hoursUntilExpiry} hours`);
          }
        } catch (scheduleError) {
          console.error(`   ❌ Error processing Firebase schedule:`, scheduleError.message);
        }
      }
    } catch (firebaseErr) {
      console.error('   ❌ Firebase schedule deletion error:', firebaseErr);
    }

    console.log(`   📊 Total expired schedules deleted: ${deletedCount}`);
    return deletedCount;

  } catch (error) {
    console.error('❌ Error deleting expired schedules:', error);
    console.error('   Details:', error.message);
    return 0;
  }
}

/**
 * 2️⃣ Delete inactive community posts (no comments after 24 hours)
 * Only deletes posts from Firebase
 * ✅ FIXED: No index required - uses simpler queries
 */
async function deleteInactiveCommunityPosts() {
  try {
    console.log('🗑️ Checking for inactive community posts...');
    
    const now = new Date();
    const thresholdDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    const thresholdTs = Timestamp.fromDate(thresholdDate);
    let deletedCount = 0;

    // Fetch posts created 24+ hours ago
    const postsQuery = query(
      collection(db, 'community_posts'),
      where('createdAt', '<=', thresholdTs)
    );
    const postsSnap = await getDocs(postsQuery);

    for (const postDoc of postsSnap.docs) {
      const postId = postDoc.id;
      const postData = postDoc.data();

      // ✅ FIXED: Get ALL comments for this post (no orderBy to avoid index requirement)
      const commentsQuery = query(
        collection(db, 'community_comments'),
        where('postId', '==', postId)
      );
      const commentsSnap = await getDocs(commentsQuery);

      // If no comments, delete the post
      if (commentsSnap.empty) {
        await deleteDoc(doc(db, 'community_posts', postId));
        console.log(`   ✅ Deleted inactive post (no comments): "${postData.text?.substring(0, 50)}..."`);
        deletedCount++;
        continue;
      }

      // Check if ALL comments are also 24+ hours old
      let hasRecentComment = false;
      commentsSnap.forEach((commentDoc) => {
        const comment = commentDoc.data();
        const commentTs = comment.createdAt;
        
        // If comment has no timestamp or is recent, mark as has recent comment
        if (!commentTs || commentTs > thresholdTs) {
          hasRecentComment = true;
        }
      });

      // If no recent comments, delete the post
      if (!hasRecentComment) {
        await deleteDoc(doc(db, 'community_posts', postId));
        console.log(`   ✅ Deleted inactive post (all comments old): "${postData.text?.substring(0, 50)}..."`);
        deletedCount++;
      } else {
        console.log(`   ⏭️ Keeping post (has recent comments): "${postData.text?.substring(0, 50)}..."`);
      }
    }

    console.log(`   📊 Total inactive posts deleted: ${deletedCount}`);
    return deletedCount;

  } catch (error) {
    console.error('❌ Error deleting inactive posts:', error);
    console.error('   Details:', error.message);
    return 0;
  }
}

/**
 * 3️⃣ Delete old notifications
 * - Earthquake/Weather/Typhoon: Delete after 5 days
 * - Food Schedule: Delete 24 hours after schedule datetime
 */
async function deleteOldNotifications() {
  try {
    console.log('🗑️ Checking for old notifications...');
    
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const fiveDaysAgoTs = Timestamp.fromDate(fiveDaysAgo);
    let deletedCount = 0;

    // Fetch all notifications
    const notificationsSnap = await getDocs(collection(db, 'notifications'));

    for (const notifDoc of notificationsSnap.docs) {
      const notif = notifDoc.data();
      const notifType = notif.data?.type || notif.type;
      const createdAt = notif.createdAt?.toDate ? notif.createdAt.toDate() : new Date(notif.createdAt);
      
      let shouldDelete = false;

      // === DELETE EARTHQUAKE/WEATHER/TYPHOON after 5 days ===
      if (['earthquake', 'weather', 'typhoon'].includes(notifType)) {
        if (createdAt <= fiveDaysAgo) {
          shouldDelete = true;
          console.log(`   ✅ Deleting old ${notifType} notification (5+ days old)`);
        }
      }

      // === DELETE FOOD SCHEDULE notifications 24 hours after schedule datetime ===
      if (['food_schedule', 'schedule', 'food'].includes(notifType)) {
        // Get schedule date and time from notification data
        const scheduleDate = notif.data?.date;
        const scheduleTime = notif.data?.time;
        
        if (scheduleDate && scheduleTime) {
          // Parse schedule datetime
          const scheduleDateTime = new Date(`${scheduleDate} ${scheduleTime}`);
          
          if (!isNaN(scheduleDateTime.getTime())) {
            // Add 24 hours to schedule datetime
            const expiryDateTime = new Date(scheduleDateTime.getTime() + 24 * 60 * 60 * 1000);
            
            if (now >= expiryDateTime) {
              shouldDelete = true;
              console.log(`   ✅ Deleting expired schedule notification (${scheduleDate} ${scheduleTime})`);
            }
          }
        } else {
          // Fallback: If no schedule date/time, delete after 7 days from creation
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (createdAt <= sevenDaysAgo) {
            shouldDelete = true;
            console.log(`   ✅ Deleting old schedule notification (no date info, 7+ days old)`);
          }
        }
      }

      // Delete if criteria met
      if (shouldDelete) {
        await deleteDoc(doc(db, 'notifications', notifDoc.id));
        deletedCount++;
      }
    }

    console.log(`   📊 Total old notifications deleted: ${deletedCount}`);
    return deletedCount;

  } catch (error) {
    console.error('❌ Error deleting old notifications:', error);
    return 0;
  }
}

/**
 * Main cleanup function - runs all three deletion tasks
 */
async function runCleanup() {
  try {
    console.log('\n🧹 === STARTING AUTO-CLEANUP ===');
    console.log('   Time:', new Date().toISOString());

    let schedulesDeleted = 0;
    let postsDeleted = 0;
    let notificationsDeleted = 0;

    // Run all three tasks independently (if one fails, others still run)
    try {
      schedulesDeleted = await deleteExpiredSchedules();
    } catch (error) {
      console.error('   ⚠️ Schedule cleanup failed:', error.message);
    }

    try {
      postsDeleted = await deleteInactiveCommunityPosts();
    } catch (error) {
      console.error('   ⚠️ Post cleanup failed:', error.message);
    }

    try {
      notificationsDeleted = await deleteOldNotifications();
    } catch (error) {
      console.error('   ⚠️ Notification cleanup failed:', error.message);
    }

    // Save last cleanup timestamp
    await AsyncStorage.setItem(LAST_CLEANUP_KEY, Date.now().toString());

    console.log('\n✅ === CLEANUP COMPLETE ===');
    console.log(`   📅 Schedules deleted: ${schedulesDeleted}`);
    console.log(`   💬 Posts deleted: ${postsDeleted}`);
    console.log(`   🔔 Notifications deleted: ${notificationsDeleted}`);
    console.log(`   🕐 Next cleanup in ${CHECK_INTERVAL_MINUTES} minutes\n`);

    return {
      schedulesDeleted,
      postsDeleted,
      notificationsDeleted,
      totalDeleted: schedulesDeleted + postsDeleted + notificationsDeleted,
    };

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return {
      schedulesDeleted: 0,
      postsDeleted: 0,
      notificationsDeleted: 0,
      totalDeleted: 0,
    };
  }
}

/**
 * Background task definition
 */
TaskManager.defineTask(AUTO_DELETE_TASK, async () => {
  try {
    console.log('🔄 Background cleanup task triggered...');
    const result = await runCleanup();
    
    if (result.totalDeleted > 0) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;

  } catch (error) {
    console.error('❌ Background cleanup task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Start auto-delete service
 */
export const startAutoDeleteService = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(AUTO_DELETE_TASK);

    if (isRegistered) {
      console.log('✅ Auto-delete service already running');
      return true;
    }

    await BackgroundFetch.registerTaskAsync(AUTO_DELETE_TASK, {
      minimumInterval: CHECK_INTERVAL_MINUTES * 60, // Convert to seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('✅ Auto-delete service started');
    console.log(`   ⏱️  Check interval: ${CHECK_INTERVAL_MINUTES} minutes`);
    console.log('   🗑️  Monitoring:');
    console.log('      • Food schedules (delete 24h after schedule time)');
    console.log('      • Community posts (delete if no comments after 24h)');
    console.log('      • Earthquake/Weather notifications (delete after 5 days)');
    console.log('      • Schedule notifications (delete 24h after schedule time)');

    // Run initial cleanup
    setTimeout(() => {
      runCleanup();
    }, 5000); // Run after 5 seconds

    return true;
  } catch (error) {
    console.error('❌ Failed to start auto-delete service:', error);
    return false;
  }
};

/**
 * Stop auto-delete service
 */
export const stopAutoDeleteService = async () => {
  try {
    await BackgroundFetch.unregisterTaskAsync(AUTO_DELETE_TASK);
    console.log('✅ Auto-delete service stopped');
    return true;
  } catch (error) {
    console.error('❌ Failed to stop auto-delete service:', error);
    return false;
  }
};

/**
 * Check if service is running
 */
export const isAutoDeleteServiceActive = async () => {
  try {
    return await TaskManager.isTaskRegisteredAsync(AUTO_DELETE_TASK);
  } catch (error) {
    return false;
  }
};

/**
 * Get last cleanup timestamp
 */
export const getLastCleanupTime = async () => {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_CLEANUP_KEY);
    return timestamp ? new Date(parseInt(timestamp)) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Manual cleanup trigger (for testing)
 */
export const triggerManualCleanup = async () => {
  try {
    console.log('🧹 Manual cleanup triggered...');
    const result = await runCleanup();
    return result;
  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
    return null;
  }
};

// Default export (for compatibility)
export default {
  startAutoDeleteService,
  stopAutoDeleteService,
  isAutoDeleteServiceActive,
  getLastCleanupTime,
  triggerManualCleanup,
};