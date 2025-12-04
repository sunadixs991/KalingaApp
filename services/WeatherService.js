// services/WeatherService.js
import axios from 'axios';

// OpenWeatherMap API Configuration
const WEATHER_API_KEY = '12683fc5064bb784e039481ab14a0d11'; // Get free key from https://openweathermap.org/api
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Fetch current weather data for given coordinates
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<Object>} Weather data object
 */
export const fetchWeatherData = async (latitude, longitude) => {
  try {
    const response = await axios.get(`${WEATHER_BASE_URL}/weather`, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: WEATHER_API_KEY,
        units: 'metric', // Use 'imperial' for Fahrenheit
      },
    });

    const data = response.data;
    
    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      main: data.weather[0].main,
      icon: data.weather[0].icon,
      windSpeed: data.wind.speed,
      pressure: data.main.pressure,
      cityName: data.name,
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
};

/**
 * Get weather icon URL from OpenWeatherMap
 * @param {string} iconCode 
 * @returns {string} Icon URL
 */
export const getWeatherIconUrl = (iconCode) => {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
};

/**
 * Get weather icon name for react-native-vector-icons/Ionicons
 * @param {string} weatherMain - Main weather condition
 * @param {string} iconCode - OpenWeatherMap icon code
 * @returns {string} Ionicons icon name
 */
export const getWeatherIcon = (weatherMain, iconCode) => {
  const isDay = iconCode?.includes('d');
  
  switch (weatherMain?.toLowerCase()) {
    case 'clear':
      return isDay ? 'sunny' : 'moon';
    case 'clouds':
      return isDay ? 'partly-sunny' : 'cloudy-night';
    case 'rain':
    case 'drizzle':
      return 'rainy';
    case 'thunderstorm':
      return 'thunderstorm';
    case 'snow':
      return 'snow';
    case 'mist':
    case 'fog':
    case 'haze':
      return 'cloud';
    default:
      return 'partly-sunny';
  }
};