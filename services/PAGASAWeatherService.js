// services/PAGASAWeatherService.js
// Philippines-specific weather alerts using PAGASA

/**
 * Fetch PAGASA weather bulletins
 * Note: PAGASA doesn't have a public API, so we'll work with RSS/web scraping
 */
export const fetchPAGASAAlerts = async () => {
  try {
    // PAGASA's main weather page
    const response = await fetch('https://www.pagasa.dost.gov.ph/');

    if (!response.ok) {
      console.log('❌ PAGASA feed unavailable');
      return [];
    }

    const text = await response.text();
    const alerts = [];

    // Look for tropical cyclone warnings in the page content
    const keywords = [
      'Tropical Cyclone',
      'Typhoon',
      'Tropical Storm',
      'Tropical Depression',
      'Severe Weather Bulletin',
      'Weather Advisory',
      'Heavy Rainfall Warning',
    ];

    let foundAlert = false;
    for (const keyword of keywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        foundAlert = true;
        break;
      }
    }

    if (foundAlert) {
      const message = 'PAGASA has issued a weather advisory. Check their website for details.';

      alerts.push({
        id: `pagasa_${new Date().toDateString()}`,
        source: 'PAGASA',
        title: 'Active Weather Advisory',
        description: message,  // ✅ Keep for backward compatibility
        details: message,      // ✅ ADD THIS LINE - DisasterMonitorService checks this first
        url: 'https://www.pagasa.dost.gov.ph/',
        severity: 'moderate',
        level: 2,
        timestamp: new Date(),
      });
    }

    return alerts;

  } catch (error) {
    console.error('❌ Error fetching PAGASA alerts:', error);
    return [];
  }
};

/**
 * Detect typhoon conditions based on weather data
 * Philippines-specific thresholds
 */
export const detectTyphoonRisk = (weather) => {
  if (!weather) return null;

  const { windSpeed, pressure, description } = weather;

  // Convert m/s to km/h for Philippine standards (multiply by 3.6)
  const windKmh = windSpeed * 3.6;

  // Super Typhoon (220+ km/h sustained winds)
  if (windKmh >= 220) {
    return {
      risk: 'super_typhoon',
      level: 5,
      message: '🌀 SUPER TYPHOON conditions detected!',
      details: `Extremely dangerous winds: ${windKmh.toFixed(0)} km/h. Seek immediate shelter in a sturdy building!`,
      color: '#8B0000', // Dark red
    };
  }

  // Typhoon (118-220 km/h)
  if (windKmh >= 118) {
    return {
      risk: 'typhoon',
      level: 4,
      message: '🌀 TYPHOON conditions detected!',
      details: `Very strong winds: ${windKmh.toFixed(0)} km/h. Stay indoors and follow evacuation orders!`,
      color: '#DC143C', // Crimson
    };
  }

  // Severe Tropical Storm (89-117 km/h)
  if (windKmh >= 89) {
    return {
      risk: 'severe_tropical_storm',
      level: 3,
      message: '🌀 Severe Tropical Storm detected',
      details: `Strong winds: ${windKmh.toFixed(0)} km/h. Prepare for heavy rain and possible flooding.`,
      color: '#FF4500', // Orange red
    };
  }

  // Tropical Storm (62-88 km/h)
  if (windKmh >= 62) {
    return {
      risk: 'tropical_storm',
      level: 2,
      message: '🌧️ Tropical Storm conditions',
      details: `Moderate to strong winds: ${windKmh.toFixed(0)} km/h. Monitor weather updates closely.`,
      color: '#FFA500', // Orange
    };
  }

  // Tropical Depression (45-61 km/h)
  if (windKmh >= 45) {
    return {
      risk: 'tropical_depression',
      level: 1,
      message: '🌧️ Tropical Depression detected',
      details: `Light to moderate winds: ${windKmh.toFixed(0)} km/h. Stay updated on weather conditions.`,
      color: '#FFD700', // Gold
    };
  }

  // Check for heavy rain even without high winds
  if (description.toLowerCase().includes('heavy rain') ||
    description.toLowerCase().includes('thunderstorm')) {
    return {
      risk: 'heavy_rain',
      level: 1,
      message: '🌧️ Heavy Rainfall Warning',
      details: 'Heavy rain expected. Watch for flooding in low-lying areas.',
      color: '#4169E1', // Royal blue
    };
  }

  return null;
};

/**
 * Get typhoon category name (PAGASA naming convention)
 */
export const getTyphoonCategory = (windSpeed) => {
  const windKmh = windSpeed * 3.6;

  if (windKmh >= 220) return 'Super Typhoon';
  if (windKmh >= 118) return 'Typhoon';
  if (windKmh >= 89) return 'Severe Tropical Storm';
  if (windKmh >= 62) return 'Tropical Storm';
  if (windKmh >= 45) return 'Tropical Depression';
  return null;
};

/**
 * Check if location is in typhoon-prone season
 * Philippines: June to November (peak season)
 */
export const isInTyphoonSeason = () => {
  const month = new Date().getMonth() + 1; // 1-12
  // June (6) to November (11)
  return month >= 6 && month <= 11;
};

/**
 * Comprehensive Philippines weather alert check
 */
export const checkPhilippinesWeatherAlerts = async (weather) => {
  const alerts = [];

  try {
    // 1. Check PAGASA official alerts
    console.log('   🔍 Fetching PAGASA website...');
    const pagasaAlerts = await fetchPAGASAAlerts();
    console.log(`   📋 PAGASA alerts found: ${pagasaAlerts.length}`);
    alerts.push(...pagasaAlerts);

    // 2. Detect typhoon risk from current weather conditions
    console.log(`   🌬️  Current wind speed: ${weather.windSpeed} m/s (${(weather.windSpeed * 3.6).toFixed(0)} km/h)`);
    const typhoonRisk = detectTyphoonRisk(weather);

    if (typhoonRisk) {
      console.log(`   ⚠️  Typhoon risk detected: ${typhoonRisk.risk} (level ${typhoonRisk.level})`);
      alerts.push({
        id: `typhoon_${new Date().toDateString()}`,
        source: 'Detection',
        title: typhoonRisk.message,
        description: typhoonRisk.details,
        details: typhoonRisk.details, // ✅ Add this for consistency
        severity: typhoonRisk.level >= 3 ? 'severe' : 'moderate',
        risk: typhoonRisk.risk,
        level: typhoonRisk.level,
        color: typhoonRisk.color,
        timestamp: new Date(),
      });
    } else {
      console.log('   ✅ No typhoon conditions detected (wind speed too low)');
    }

    // 3. Seasonal awareness
    if (isInTyphoonSeason() && alerts.length === 0) {
      console.log('📅 Currently in typhoon season (June-November)');
    }

    console.log(`   📊 Total alerts to return: ${alerts.length}`);

  } catch (error) {
    console.error('❌ Error checking Philippines weather alerts:', error);
  }

  return alerts;
};