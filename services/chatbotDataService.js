import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { supabase } from "../services/supabaseClient";


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
      // Prefer Supabase for food schedules if available
      let schedules = [];
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('food_schedules') // adjust table name if different
            .select('*')
            .order('date', { ascending: true })
            .limit(5);
          if (error) throw error;
          schedules = (data || []).map((r) => ({
            id: r.id || null,
            title: r.title || r.name || null,
            date: r.date || r.scheduled_at || null,
            time: r.time || r.time_range || '',
            location: r.location || r.barangay || r.venue || '',
            ...r,
          }));
        } else {
          // fallback to Firestore if supabase client not configured
          const foodRef = collection(db, 'foodSchedules');
          const foodQuery = query(foodRef, orderBy('date', 'asc'), limit(5));
          const foodSnapshot = await getDocs(foodQuery);
          schedules = foodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (err) {
        console.warn('Failed to load food schedules from Supabase/Firestore:', err);
        schedules = [];
      }
      context.foodSchedules = schedules;
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
  // helper: safe string cleanup
  const clean = (v) =>
    (v === null || v === undefined) ? "" :
    String(v).replace(/\*/g, "").replace(/\s+/g, " ").trim();

  // helper: convert Firestore timestamp or ISO/string to Date
  const toDateObj = (d) => {
    if (!d) return null;
    if (typeof d.toDate === "function") return d.toDate();
    const parsed = new Date(d);
    return isNaN(parsed) ? null : parsed;
  };

  // helper: format date/time
  const fmtDate = (d) => {
    const dt = toDateObj(d);
    return dt ? dt.toLocaleDateString() : "Unknown date";
  };
  const fmtTime = (t) => clean(t) || "Unknown time";

  let contextText = "\n\n--- RELEVANT DATABASE INFORMATION ---\n";

  // Evacuation centers (sort by capacity desc then name)
  if (context.evacuationCenters && context.evacuationCenters.length > 0) {
    const centers = [...context.evacuationCenters].sort((a, b) => {
      const ca = Number(a.capacity) || 0;
      const cb = Number(b.capacity) || 0;
      if (cb !== ca) return cb - ca;
      return clean(a.facilityName).localeCompare(clean(b.facilityName));
    });
    contextText += "\n🏢 Evacuation Centers:\n";
    centers.forEach(center => {
      contextText += `- ${clean(center.facilityName) || "Evacuation Center"}\n`;
      if (center.barangay) contextText += `  • Barangay: ${clean(center.barangay)}\n`;
      if (center.purok) contextText += `  • Purok: ${clean(center.purok)}\n`;
      if (center.sitio) contextText += `  • Sitio: ${clean(center.sitio)}\n`;
      if (center.capacity) contextText += `  • Capacity: ${clean(center.capacity)} people\n`;
      if (center.description) contextText += `  • Notes: ${clean(center.description)}\n`;
      contextText += "\n";
    });
  }

  // Medical facilities
  if (context.medicalFacilities && context.medicalFacilities.length > 0) {
    contextText += "\n🏥 Medical Facilities:\n";
    const meds = [...context.medicalFacilities].sort((a,b)=> clean(a.barangay).localeCompare(clean(b.barangay)));
    meds.forEach(facility => {
      contextText += `- ${clean(facility.name) || "Medical Support Location"}\n`;
      if (facility.barangay) contextText += `  • Barangay: ${clean(facility.barangay)}\n`;
      if (facility.openTime) contextText += `  • Open Time: ${clean(facility.openTime)}\n`;
      if (facility.description) contextText += `  • Notes: ${clean(facility.description)}\n`;
      contextText += "\n";
    });
  }

  // Food schedules (sort by date ascending)
  if (context.foodSchedules && context.foodSchedules.length > 0) {
    const schedules = [...context.foodSchedules].sort((a, b) => {
      const da = toDateObj(a.date) || new Date(0);
      const db = toDateObj(b.date) || new Date(0);
      return da - db;
    });
    contextText += "\n🍽️ Food Distribution Schedules:\n";
    schedules.forEach(schedule => {
      contextText += `- ${clean(schedule.title) || "Food Distribution"}\n`;
      if (schedule.date) contextText += `  • Date: ${fmtDate(schedule.date)}\n`;
      if (schedule.time) contextText += `  • Time: ${fmtTime(schedule.time)}\n`;
      if (schedule.location) contextText += `  • Location: ${clean(schedule.location)}\n`;
      // include minimal extra useful fields if present
      if (schedule.notes) contextText += `  • Notes: ${clean(schedule.notes)}\n`;
      contextText += "\n";
    });
  }

  // Emergency contacts (sort by name)
  if (context.emergencyContacts && context.emergencyContacts.length > 0) {
    const contacts = [...context.emergencyContacts].sort((a,b)=> clean(a.name).localeCompare(clean(b.name)));
    contextText += "\n📞 Emergency Contacts:\n";
    contacts.forEach(contact => {
      contextText += `- ${clean(contact.name)}: ${clean(contact.number)}\n`;
    });
    contextText += "\n";
  }

  // Security alerts (sort by timestamp desc)
  if (context.securityAlerts && context.securityAlerts.length > 0) {
    const alerts = [...context.securityAlerts].sort((a,b)=>{
      const ta = toDateObj(a.timestamp) || new Date(0);
      const tb = toDateObj(b.timestamp) || new Date(0);
      return tb - ta;
    });
    contextText += "\n⚠️ Recent Security Alerts:\n";
    alerts.forEach(alert => {
      contextText += `- ${clean(alert.type) || "Alert"}\n`;
      if (alert.reason) contextText += `  • Reason: ${clean(alert.reason)}\n`;
      if (alert.timestamp) contextText += `  • When: ${fmtDate(alert.timestamp)}\n`;
      contextText += "\n";
    });
  }

  // Community pins
  if (context.communityPins && context.communityPins.length > 0) {
    contextText += "\n📍 Community Services / Pins:\n";
    context.communityPins.forEach(pin => {
      contextText += `- ${clean(pin.category) || "Service"}\n`;
      if (pin.barangay) contextText += `  • Barangay: ${clean(pin.barangay)}\n`;
      if (pin.description) contextText += `  • Notes: ${clean(pin.description)}\n`;
      contextText += "\n";
    });
  }

  // Barangays list
  if (context.barangays && context.barangays.length > 0) {
    contextText += "\n🏘️ Barangays:\n";
    context.barangays.forEach(brgy => {
      contextText += `- ${clean(brgy.name)}\n`;
    });
    contextText += "\n";
  }

  contextText += '--- END DATABASE INFORMATION ---\n\n';
  contextText += "INSTRUCTIONS: Use the above information to answer the user's question accurately and helpfully. ";
  contextText += "If the information needed is not in the database, provide general guidance or suggest contacting emergency services. ";
  contextText += "Be concise and format locations and contact details clearly.\n\n";

  return contextText;
};

export const cleanModelOutput = (text) => {
  if (!text) return "";
  let out = String(text);

  // convert markdown list markers to bullet
  out = out.replace(/^\s*[*\-\+]\s+/gm, "• ");

  // remove bold/italic markers (**bold**, *italic*, _italic_)
  out = out.replace(/\*\*(.*?)\*\*/g, "$1");
  out = out.replace(/\*(.*?)\*/g, "$1");
  out = out.replace(/_(.*?)_/g, "$1");

  // remove inline/code backticks and triple backticks
  out = out.replace(/`{1,3}/g, "");

  // remove stray asterisks left over
  out = out.replace(/\s*\*\s*/g, " ");

  // collapse multiple blank lines
  out = out.replace(/\n{3,}/g, "\n\n");

  // trim each line and overall
  out = out
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .join("\n")
    .trim();

  return out;
};
