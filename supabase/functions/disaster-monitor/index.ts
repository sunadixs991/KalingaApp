// supabase/functions/disaster-monitor/index.ts
// @ts-ignore: Deno global
declare const Deno: any;

// ==================== CONFIGURATION ====================

const OPENWEATHER_API_KEY = '12683fc5064bb784e039481ab14a0d11';
const EMSC_API = 'https://www.seismicportal.eu/fdsnws/event/1/query';
const USGS_API = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const WEATHER_API = 'https://api.openweathermap.org/data/2.5/weather';
const PAGASA_URL = 'https://www.pagasa.dost.gov.ph/';

// Disaster thresholds
const EARTHQUAKE_MIN_MAGNITUDE = 3.0;
const EARTHQUAKE_RADIUS_KM = 250;
const EARTHQUAKE_LOOKBACK_MINUTES = 10; // Check last 10 minutes for new quakes

// Firebase configuration
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');
const FIREBASE_API_KEY = Deno.env.get('FIREBASE_API_KEY');
const FIREBASE_DB_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// Supabase push notification endpoint
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const PUSH_NOTIFICATION_URL = `${SUPABASE_URL}/functions/v1/send-push-notification`;

// ==================== INTERFACES ====================

interface UserLocation {
  username: string;
  token: string;
  latitude: number;
  longitude: number;
  platform: string;
}

interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  latitude: number;
  longitude: number;
  depth: number;
  time: Date;
  url: string;
}

interface WeatherData {
  temperature: number;
  windSpeed: number;
  pressure: number;
  description: string;
  main: string;
}

interface TyphoonAlert {
  risk: string;
  level: number;
  message: string;
  details: string;
  windSpeed: number;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Get earthquake severity message
 */
function getEarthquakeSeverity(magnitude: number): string {
  if (magnitude >= 7.0) return 'MAJOR EARTHQUAKE - Seek immediate shelter!';
  if (magnitude >= 6.0) return 'Strong earthquake - Stay alert!';
  if (magnitude >= 5.0) return 'Moderate earthquake - Take precautions.';
  if (magnitude >= 4.0) return 'Light earthquake detected.';
  return 'Minor earthquake detected.';
}

// ==================== FIREBASE FUNCTIONS ====================

/**
 * Fetch user locations from Firebase
 */
async function fetchUserLocations(): Promise<UserLocation[]> {
  try {
    const tokensUrl = `${FIREBASE_DB_URL}/pushTokens?key=${FIREBASE_API_KEY}`;
    const response = await fetch(tokensUrl);
    
    if (!response.ok) {
      console.error('❌ Failed to fetch push tokens from Firebase');
      return [];
    }

    const data = await response.json();
    const users: UserLocation[] = [];

    if (data.documents) {
      for (const doc of data.documents) {
        const fields = doc.fields;
        
        // Only include users with valid location data
        if (fields.token?.stringValue && 
            fields.latitude?.doubleValue !== undefined && 
            fields.longitude?.doubleValue !== undefined) {
          users.push({
            username: fields.username?.stringValue || 'unknown',
            token: fields.token.stringValue,
            latitude: fields.latitude.doubleValue,
            longitude: fields.longitude.doubleValue,
            platform: fields.platform?.stringValue || 'unknown',
          });
        }
      }
    }

    console.log(`✅ Fetched ${users.length} users with location data`);
    return users;
  } catch (error) {
    console.error('❌ Error fetching user locations:', error);
    return [];
  }
}

/**
 * Save disaster event to Firebase (prevent duplicates)
 */
async function saveDisasterEvent(type: string, eventId: string, data: any): Promise<boolean> {
  try {
    // Check if event already exists
    const checkUrl = `${FIREBASE_DB_URL}/disasterEvents?key=${FIREBASE_API_KEY}`;
    const checkResponse = await fetch(checkUrl);
    
    if (checkResponse.ok) {
      const existing = await checkResponse.json();
      if (existing.documents) {
        for (const doc of existing.documents) {
          if (doc.fields.eventId?.stringValue === eventId) {
            console.log(`   ⚠️  Event ${eventId} already processed`);
            return false;
          }
        }
      }
    }

    // Save new event
    const saveUrl = `${FIREBASE_DB_URL}/disasterEvents?key=${FIREBASE_API_KEY}`;
    const saveResponse = await fetch(saveUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          type: { stringValue: type },
          eventId: { stringValue: eventId },
          data: { stringValue: JSON.stringify(data) },
          timestamp: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    return saveResponse.ok;
  } catch (error) {
    console.error('❌ Error saving disaster event:', error);
    return false;
  }
}

/**
 * Save notification to Firebase history
 */
async function saveNotificationHistory(username: string, title: string, body: string, data: any) {
  try {
    const url = `${FIREBASE_DB_URL}/notifications?key=${FIREBASE_API_KEY}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          username: { stringValue: username },
          title: { stringValue: title },
          body: { stringValue: body },
          data: { stringValue: JSON.stringify(data) },
          type: { stringValue: data.type || 'general' },
          isPublic: { booleanValue: true },
          read: { booleanValue: false },
          createdAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });
  } catch (error) {
    console.error('❌ Error saving notification history:', error);
  }
}

// ==================== EARTHQUAKE MONITORING ====================

/**
 * Fetch earthquakes from EMSC (preferred for Asia/Pacific)
 */
async function fetchEMSCEarthquakes(): Promise<Earthquake[]> {
  try {
    const startTime = new Date(Date.now() - EARTHQUAKE_LOOKBACK_MINUTES * 60 * 1000).toISOString();
    
    const url = `${EMSC_API}?format=json&minmag=${EARTHQUAKE_MIN_MAGNITUDE}&orderby=time&limit=50&starttime=${startTime}`;
    
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`EMSC API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return [];
    }

    const earthquakes: Earthquake[] = data.features.map((feature: any) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;

      return {
        id: feature.id || `emsc_${props.time}_${Math.random()}`,
        magnitude: parseFloat(props.mag) || 0,
        place: props.flynn_region || props.place || 'Unknown location',
        latitude: coords[1],
        longitude: coords[0],
        depth: coords[2] || 0,
        time: new Date(props.time),
        url: `https://www.emsc-csem.org/Earthquake/earthquake.php?id=${feature.id}`,
      };
    });

    return earthquakes.filter(eq => eq.magnitude > 0);
  } catch (error) {
    console.error('❌ EMSC API error:', error);
    throw error;
  }
}

/**
 * Fetch earthquakes from USGS (fallback)
 */
async function fetchUSGSEarthquakes(): Promise<Earthquake[]> {
  try {
    const startTime = new Date(Date.now() - EARTHQUAKE_LOOKBACK_MINUTES * 60 * 1000).toISOString();
    
    const url = `${USGS_API}?format=geojson&minmagnitude=${EARTHQUAKE_MIN_MAGNITUDE}&orderby=time&limit=50&starttime=${startTime}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`USGS API error: ${response.status}`);
    }

    const data = await response.json();

    const earthquakes: Earthquake[] = data.features.map((feature: any) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;

      return {
        id: feature.id,
        magnitude: props.mag,
        place: props.place,
        latitude: coords[1],
        longitude: coords[0],
        depth: coords[2],
        time: new Date(props.time),
        url: props.url,
      };
    });

    return earthquakes;
  } catch (error) {
    console.error('❌ USGS API error:', error);
    throw error;
  }
}

/**
 * Check for new earthquakes and notify affected users
 */
async function checkEarthquakes(users: UserLocation[]): Promise<number> {
  try {
    console.log('🌍 Checking earthquakes...');
    
    let earthquakes: Earthquake[] = [];

    // Try EMSC first
    try {
      earthquakes = await fetchEMSCEarthquakes();
      console.log(`   ✅ EMSC: Found ${earthquakes.length} recent earthquakes`);
    } catch (error) {
      console.log('   ⚠️  EMSC failed, trying USGS...');
      earthquakes = await fetchUSGSEarthquakes();
      console.log(`   ✅ USGS: Found ${earthquakes.length} recent earthquakes`);
    }

    if (earthquakes.length === 0) {
      console.log('   No recent earthquakes');
      return 0;
    }

    let notificationsSent = 0;

    for (const quake of earthquakes) {
      // Check if we've already processed this earthquake
      const isNew = await saveDisasterEvent('earthquake', quake.id, {
        magnitude: quake.magnitude,
        place: quake.place,
        time: quake.time.toISOString(),
      });

      if (!isNew) {
        continue;
      }

      console.log(`   🚨 NEW QUAKE: ${quake.magnitude.toFixed(1)} - ${quake.place}`);

      // Find users within radius
      const affectedUsers = users.filter(user => {
        const distance = calculateDistance(
          user.latitude,
          user.longitude,
          quake.latitude,
          quake.longitude
        );
        return distance <= EARTHQUAKE_RADIUS_KM;
      });

      if (affectedUsers.length === 0) {
        console.log(`      No users within ${EARTHQUAKE_RADIUS_KM}km`);
        continue;
      }

      console.log(`      📍 ${affectedUsers.length} users affected`);

      // Prepare notification
      const severity = getEarthquakeSeverity(quake.magnitude);
      const title = `🚨 Earthquake Alert - Magnitude ${quake.magnitude.toFixed(1)}`;
      const body = `${quake.place}. ${severity}`;
      const channelId = quake.magnitude >= 7.0 ? 'earthquake_critical' : 'earthquake';

      const tokens = affectedUsers.map(u => u.token);

      // Send push notifications
      try {
        const pushResponse = await fetch(PUSH_NOTIFICATION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            tokens,
            title,
            body,
            data: {
              type: 'earthquake',
              magnitude: quake.magnitude,
              location: quake.place,
              quakeId: quake.id,
              latitude: quake.latitude,
              longitude: quake.longitude,
              url: quake.url,
            },
            channelId,
          }),
        });

        const result = await pushResponse.json();
        console.log(`      ✅ Sent: ${result.sent || 0}, Failed: ${result.failed || 0}`);
        notificationsSent += result.sent || 0;

        // Save to notification history
        await saveNotificationHistory('all', title, body, {
          type: 'earthquake',
          magnitude: quake.magnitude,
          location: quake.place,
        });

      } catch (error) {
        console.error(`      ❌ Failed to send notifications:`, error);
      }
    }

    return notificationsSent;
  } catch (error) {
    console.error('❌ Earthquake check failed:', error);
    return 0;
  }
}

// ==================== WEATHER & TYPHOON MONITORING ====================

/**
 * Fetch weather data for a location
 */
async function fetchWeatherData(latitude: number, longitude: number): Promise<WeatherData | null> {
  try {
    const url = `${WEATHER_API}?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      temperature: Math.round(data.main.temp),
      windSpeed: data.wind.speed,
      pressure: data.main.pressure,
      description: data.weather[0].description,
      main: data.weather[0].main,
    };
  } catch (error) {
    console.error('❌ Weather API error:', error);
    return null;
  }
}

/**
 * Detect typhoon conditions
 */
function detectTyphoonRisk(weather: WeatherData): TyphoonAlert | null {
  const windKmh = weather.windSpeed * 3.6;

  if (windKmh >= 220) {
    return {
      risk: 'super_typhoon',
      level: 5,
      message: '🌀 SUPER TYPHOON conditions detected!',
      details: `Extremely dangerous winds: ${windKmh.toFixed(0)} km/h. Seek immediate shelter in a sturdy building!`,
      windSpeed: windKmh,
    };
  }

  if (windKmh >= 118) {
    return {
      risk: 'typhoon',
      level: 4,
      message: '🌀 TYPHOON conditions detected!',
      details: `Very strong winds: ${windKmh.toFixed(0)} km/h. Stay indoors and follow evacuation orders!`,
      windSpeed: windKmh,
    };
  }

  if (windKmh >= 89) {
    return {
      risk: 'severe_tropical_storm',
      level: 3,
      message: '🌀 Severe Tropical Storm detected',
      details: `Strong winds: ${windKmh.toFixed(0)} km/h. Prepare for heavy rain and possible flooding.`,
      windSpeed: windKmh,
    };
  }

  if (windKmh >= 62) {
    return {
      risk: 'tropical_storm',
      level: 2,
      message: '🌧️ Tropical Storm conditions',
      details: `Moderate to strong winds: ${windKmh.toFixed(0)} km/h. Monitor weather updates closely.`,
      windSpeed: windKmh,
    };
  }

  if (windKmh >= 45) {
    return {
      risk: 'tropical_depression',
      level: 1,
      message: '🌧️ Tropical Depression detected',
      details: `Light to moderate winds: ${windKmh.toFixed(0)} km/h. Stay updated on weather conditions.`,
      windSpeed: windKmh,
    };
  }

  return null;
}

/**
 * Check PAGASA website for active alerts
 */
async function checkPAGASAAlerts(): Promise<boolean> {
  try {
    const response = await fetch(PAGASA_URL);
    
    if (!response.ok) {
      return false;
    }

    const text = await response.text();
    
    const keywords = [
      'Tropical Cyclone',
      'Typhoon',
      'Tropical Storm',
      'Tropical Depression',
      'Severe Weather Bulletin',
      'Weather Advisory',
    ];

    for (const keyword of keywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('❌ PAGASA check error:', error);
    return false;
  }
}

/**
 * Check weather alerts for a specific location
 */
async function checkWeatherForLocation(
  user: UserLocation,
  allAlerts: Map<string, any>
): Promise<any | null> {
  const weather = await fetchWeatherData(user.latitude, user.longitude);
  
  if (!weather) {
    return null;
  }

  // Check for typhoon conditions
  const typhoonRisk = detectTyphoonRisk(weather);
  
  if (typhoonRisk) {
    const eventId = `typhoon_${typhoonRisk.risk}_${new Date().toDateString()}`;
    
    if (!allAlerts.has(eventId)) {
      allAlerts.set(eventId, {
        type: 'typhoon',
        risk: typhoonRisk.risk,
        level: typhoonRisk.level,
        title: typhoonRisk.message,
        body: typhoonRisk.details,
        windSpeed: typhoonRisk.windSpeed,
      });
      
      return {
        user,
        alert: typhoonRisk,
        channelId: typhoonRisk.level >= 3 ? 'weather_critical' : 'weather',
      };
    }
  }

  // Check for other severe weather
  const desc = weather.description.toLowerCase();
  const windKmh = weather.windSpeed * 3.6;

  // High wind alert
  if (windKmh > 60) {
    const eventId = `high_wind_${new Date().toDateString()}`;
    if (!allAlerts.has(eventId)) {
      allAlerts.set(eventId, { type: 'high_wind' });
      return {
        user,
        alert: {
          risk: 'high_wind',
          level: 2,
          message: '🌪️ High Wind Alert',
          details: `Strong winds detected: ${windKmh.toFixed(0)} km/h. Stay indoors and secure loose objects.`,
        },
        channelId: 'weather',
      };
    }
  }

  // Storm alert
  if (desc.includes('storm') || desc.includes('thunderstorm')) {
    const eventId = `storm_${new Date().toDateString()}`;
    if (!allAlerts.has(eventId)) {
      allAlerts.set(eventId, { type: 'storm' });
      return {
        user,
        alert: {
          risk: 'storm',
          level: 2,
          message: '⛈️ Storm Warning',
          details: `${weather.description}. Seek shelter immediately.`,
        },
        channelId: 'weather_critical',
      };
    }
  }

  return null;
}

/**
 * Check weather and typhoon alerts for all users
 */
async function checkWeatherAlerts(users: UserLocation[]): Promise<number> {
  try {
    console.log('🌦️  Checking weather & typhoon alerts...');
    
    // Check PAGASA first
    const pagasaActive = await checkPAGASAAlerts();
    if (pagasaActive) {
      console.log('   ⚠️  PAGASA has active weather advisory');
    }

    const allAlerts = new Map<string, any>();
    let notificationsSent = 0;

    // Check weather for each user location
    const weatherChecks = await Promise.all(
      users.map(user => checkWeatherForLocation(user, allAlerts))
    );

    const alertsToSend = weatherChecks.filter(check => check !== null);

    if (alertsToSend.length === 0) {
      console.log('   No weather alerts');
      return 0;
    }

    console.log(`   📢 Found ${allAlerts.size} unique weather events affecting ${alertsToSend.length} users`);

    // Group alerts by event type
    const groupedAlerts = new Map<string, any[]>();
    
    for (const alertInfo of alertsToSend) {
      const key = alertInfo.alert.risk;
      if (!groupedAlerts.has(key)) {
        groupedAlerts.set(key, []);
      }
      groupedAlerts.get(key)!.push(alertInfo);
    }

    // Send notifications for each alert type
    for (const [risk, alerts] of groupedAlerts) {
      const firstAlert = alerts[0];
      const tokens = alerts.map(a => a.user.token);

      const eventId = `weather_${risk}_${new Date().toDateString()}`;
      const isNew = await saveDisasterEvent('weather', eventId, {
        risk,
        level: firstAlert.alert.level,
        affectedUsers: alerts.length,
      });

      if (!isNew) {
        console.log(`      ⚠️  Alert ${risk} already sent today`);
        continue;
      }

      try {
        const pushResponse = await fetch(PUSH_NOTIFICATION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            tokens,
            title: firstAlert.alert.message,
            body: firstAlert.alert.details,
            data: {
              type: 'weather',
              alertType: risk,
              level: firstAlert.alert.level,
            },
            channelId: firstAlert.channelId,
          }),
        });

        const result = await pushResponse.json();
        console.log(`      ✅ ${risk}: Sent to ${result.sent || 0} users`);
        notificationsSent += result.sent || 0;

        // Save to history
        await saveNotificationHistory('all', firstAlert.alert.message, firstAlert.alert.details, {
          type: 'weather',
          alertType: risk,
        });

      } catch (error) {
        console.error(`      ❌ Failed to send ${risk} alert:`, error);
      }
    }

    return notificationsSent;
  } catch (error) {
    console.error('❌ Weather check failed:', error);
    return 0;
  }
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
    console.log('🔍 ============================================');
    console.log('🔍 DISASTER MONITOR CHECK STARTED');
    console.log('🔍 Time:', new Date().toISOString());
    console.log('🔍 ============================================');

    // Fetch all users with location data
    const users = await fetchUserLocations();

    if (users.length === 0) {
      console.log('⚠️  No users with location data found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users to monitor',
          earthquakeNotifications: 0,
          weatherNotifications: 0,
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`👥 Monitoring ${users.length} users`);

    // Run earthquake and weather checks in parallel
    const [earthquakeCount, weatherCount] = await Promise.all([
      checkEarthquakes(users),
      checkWeatherAlerts(users),
    ]);

    const totalNotifications = earthquakeCount + weatherCount;

    console.log('🔍 ============================================');
    console.log('✅ DISASTER MONITOR CHECK COMPLETED');
    console.log(`   📤 Earthquake notifications: ${earthquakeCount}`);
    console.log(`   🌦️  Weather notifications: ${weatherCount}`);
    console.log(`   📊 Total notifications sent: ${totalNotifications}`);
    console.log('🔍 ============================================');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Check complete. Sent ${totalNotifications} notifications.`,
        earthquakeNotifications: earthquakeCount,
        weatherNotifications: weatherCount,
        totalNotifications,
        usersMonitored: users.length,
        timestamp: new Date().toISOString(),
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ ============================================');
    console.error('❌ DISASTER MONITOR ERROR:', errorMessage);
    console.error('❌ Stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('❌ ============================================');

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
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