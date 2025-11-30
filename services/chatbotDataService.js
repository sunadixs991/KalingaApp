import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export const getChatbotContext = async (username, userMessage) => {
  try {
    const context = {};
    const lowerMessage = userMessage.toLowerCase();
    
    // Get user's barangay for location-specific queries
    let userBarangay = null;
    if (username) {
      try {
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('username', '==', username), limit(1));
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          userBarangay = userData.barangay;
          context.userInfo = userData;
        }
      } catch (error) {
        console.log('Could not fetch user barangay:', error);
      }
    }
    
    // If asking about evacuation centers
    if (lowerMessage.includes('evacuation') || lowerMessage.includes('center') || lowerMessage.includes('shelter')) {
      const evacuationRef = collection(db, 'evacuation_pins');
      let q = evacuationRef;
      
      // Filter by user's barangay if available
      if (userBarangay && userBarangay !== 'Unknown') {
        q = query(evacuationRef, where('barangay', '==', userBarangay));
      }
      
      const evacuationSnapshot = await getDocs(q);
      context.evacuationCenters = evacuationSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    // If asking about medical assistance
    if (lowerMessage.includes('medical') || lowerMessage.includes('health') || lowerMessage.includes('hospital') || lowerMessage.includes('clinic')) {
      const medicalRef = collection(db, 'medical_pins');
      const medicalSnapshot = await getDocs(medicalRef);
      context.medicalFacilities = medicalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    // If asking about food schedules/distribution
    if (lowerMessage.includes('food') || lowerMessage.includes('distribution') || lowerMessage.includes('schedule')) {
      const foodRef = collection(db, 'foodSchedules');
      const foodQuery = query(foodRef, orderBy('date', 'asc'), limit(5));
      const foodSnapshot = await getDocs(foodQuery);
      context.foodSchedules = foodSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    // If asking about emergency contacts
    if (lowerMessage.includes('contact') || lowerMessage.includes('hotline') || lowerMessage.includes('emergency') || lowerMessage.includes('help')) {
      const contactsRef = collection(db, 'contacts');
      const contactsSnapshot = await getDocs(contactsRef);
      context.emergencyContacts = contactsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    // If asking about security alerts
    if (lowerMessage.includes('alert') || lowerMessage.includes('security') || lowerMessage.includes('warning') || lowerMessage.includes('danger')) {
      const alertsRef = collection(db, 'security_alerts');
      const alertsQuery = query(alertsRef, orderBy('timestamp', 'desc'), limit(3));
      const alertsSnapshot = await getDocs(alertsQuery);
      context.securityAlerts = alertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    // If asking about charging stations or other pins
    if (lowerMessage.includes('charging') || lowerMessage.includes('station') || lowerMessage.includes('service')) {
      const pinsRef = collection(db, 'pins');
      const pinsSnapshot = await getDocs(pinsRef);
      context.communityPins = pinsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    // If asking about barangays
    if (lowerMessage.includes('barangay') || lowerMessage.includes('area')) {
      const barangaysRef = collection(db, 'barangays');
      const barangaysSnapshot = await getDocs(barangaysRef);
      context.barangays = barangaysSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    return context;
  } catch (error) {
    console.error('Error fetching chatbot context:', error);
    return {};
  }
};

export const formatContextForPrompt = (context) => {
  let contextText = '\n\n--- RELEVANT DATABASE INFORMATION ---\n';
  
  if (context.evacuationCenters && context.evacuationCenters.length > 0) {
    contextText += '\n🏢 Available Evacuation Centers:\n';
    context.evacuationCenters.forEach(center => {
      contextText += `- ${center.facilityName || 'Evacuation Center'}\n`;
      contextText += `  Location: ${center.barangay}\n`;
      contextText += `  Capacity: ${center.capacity} people\n`;
      contextText += `  Description: ${center.description || 'N/A'}\n`;
      if (center.purok) contextText += `  Purok: ${center.purok}\n`;
      if (center.sitio) contextText += `  Sitio: ${center.sitio}\n`;
      contextText += '\n';
    });
  }
  
  if (context.medicalFacilities && context.medicalFacilities.length > 0) {
    contextText += '\n🏥 Medical Facilities:\n';
    context.medicalFacilities.forEach(facility => {
      contextText += `- Medical Support Location\n`;
      contextText += `  Barangay: ${facility.barangay}\n`;
      contextText += `  Description: ${facility.description || 'N/A'}\n`;
      if (facility.openTime) contextText += `  Open Time: ${facility.openTime}\n`;
      contextText += '\n';
    });
  }
  
  if (context.foodSchedules && context.foodSchedules.length > 0) {
    contextText += '\n🍽️ Food Distribution Schedules:\n';
    context.foodSchedules.forEach(schedule => {
      contextText += `- ${schedule.title || 'Food Distribution'}\n`;
      contextText += `  Date: ${new Date(schedule.date).toLocaleDateString()}\n`;
      contextText += `  Time: ${schedule.time}\n`;
      contextText += `  Location: ${schedule.location}\n`;
      contextText += '\n';
    });
  }
  
  if (context.emergencyContacts && context.emergencyContacts.length > 0) {
    contextText += '\n📞 Emergency Contacts:\n';
    context.emergencyContacts.forEach(contact => {
      contextText += `- ${contact.name}: ${contact.number}\n`;
    });
    contextText += '\n';
  }
  
  if (context.securityAlerts && context.securityAlerts.length > 0) {
    contextText += '\n⚠️ Recent Security Alerts:\n';
    context.securityAlerts.forEach(alert => {
      contextText += `- Type: ${alert.type}\n`;
      if (alert.reason) contextText += `  Reason: ${alert.reason}\n`;
      contextText += '\n';
    });
  }
  
  if (context.communityPins && context.communityPins.length > 0) {
    contextText += '\n📍 Community Services:\n';
    context.communityPins.forEach(pin => {
      contextText += `- ${pin.category}\n`;
      contextText += `  Location: ${pin.barangay}\n`;
      contextText += `  Description: ${pin.description}\n`;
      contextText += '\n';
    });
  }
  
  if (context.barangays && context.barangays.length > 0) {
    contextText += '\n🏘️ Available Barangays:\n';
    context.barangays.forEach(brgy => {
      contextText += `- ${brgy.name}\n`;
    });
    contextText += '\n';
  }
  
  contextText += '--- END DATABASE INFORMATION ---\n\n';
  contextText += 'INSTRUCTIONS: Use the above information to answer the user\'s question accurately and helpfully. ';
  contextText += 'If the information needed is not in the database, provide general guidance or suggest contacting emergency services. ';
  contextText += 'Be concise but informative. If showing locations or contacts, format them clearly.\n\n';
  
  return contextText;
};
