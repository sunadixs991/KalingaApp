# 🌐 Kalinga: Katalyst Application with Localized Interactive Guided-relief Map

  ## Kalinga is a mobile application designed to assist individuals and communities during times of crisis by providing timely access to essential services, resources, and information. The app uses location-based services, offline accessibility, and AI-powered chatbot support to ensure fair, organized, and efficient relief distribution during calamities.

### 🚀 Features

🔹 1. Location-Based Relief Distribution

    - View relief distribution schedules in your area.
    - Receive SMS notifications for food, water, and medical aid.

🔹 2. Emergency Hotlines

    - Access pre-dial emergency contacts instantly.

🔹 3. Evacuation Centers & Shelter Locator

    - Find nearby shelters and evacuation centers.
    - See distance, maximum capacity, and availability in real time.

🔹 4. Offline Accessibility

    - Access critical information even without internet.
    - Data like shelter locations, schedules, and contacts will auto-update when online.

  🔹 6. AI-Powered Chatbot
        
    - Get instant answers to FAQs.
    - Guides users to:
      Nearest shelters
      Relief distribution schedules
      Evacuation routes
      First-aid steps & safety tips

### 🛠 Tech Stack

| **Technology**          | **Purpose**                  |
| ----------------------- | ---------------------------- |
| **React Native + Expo** | Mobile app frontend          |
| **Node.js**             | Backend API & services       |
| **Firebase Firestore**  | Real-time database & storage |
| **Google Gemini API**   | AI-powered chatbot           |
| **Leaflet / OSM**       | Map & shelter locator        |
| **Twilio** *(optional)* | SMS notifications            |
| **GitHub**              | Version control              |

### 📦 Installation & Setup

Follow these steps to set up Kalinga locally:

1. Clone the Repository

       git clone https://github.com/your-username/KalingaApp.git
       cd KalingaApp

2. Install Dependencies

        npm install
         # or
        yarn install

3. Configure Firebase

   **Go to Firebase Console.**

     Create a new project & enable Firestore.

     KalingaApp/android/app/google-services.json

     KalingaApp/ios/GoogleService-Info.plist

     Place them inside:

       KalingaApp/android/app/google-services.json
       KalingaApp/ios/GoogleService-Info.plist
   
5. Set Up Environment Variables
   
    Create a .env file and add:

       FIREBASE_API_KEY=your_api_key
       FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
       FIREBASE_PROJECT_ID=your_project_id
       FIREBASE_STORAGE_BUCKET=your_project.appspot.com
       FIREBASE_MESSAGING_SENDER_ID=your_sender_id
       FIREBASE_APP_ID=your_app_id
       GEMINI_API_KEY=your_gemini_key
       TWILIO_SID=your_twilio_sid
       TWILIO_AUTH_TOKEN=your_twilio_token

5. Start the App

       npx expo start
   Press a → Open Android Emulator

   Press i → Open iOS Simulator

   Or scan the QR code in the Expo Go app.

### 📲 Usage Guide

**For Users**
1. Enable location services for real-time relief updates.
2. Use the map view to find available resources.
3. Tap emergency hotlines to make quick calls and messages.
4. Chat with the AI-powered assistant for instant help.

**For Admins / Relief Coordinators**
1. Manage relief schedules
2. Track distribution progress and improve coordination.

### 🙏 Acknowledgments

**OpenStreetMap & Leaflet → Mapping services**

**Firebase → Database & authentication**

**Google Gemini AI → Chatbot integration**

**Twilio / SMS API → Relief notifications**



