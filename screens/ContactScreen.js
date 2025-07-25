// screens/SettingsScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const contacts = [
  { name: 'Police', number: '911' },
  { name: 'Fire Department', number: '922' },
  { name: 'Ambulance', number: '933' },
  { name: 'DRRM', number: '0945 685 2435' },
  { name: 'Local Government', number: '0945 685 2436' },
  { name: 'Red Cross', number: '0945 685 2437' },
  { name: 'Disaster Response Team', number: '0945 685 2438' },
  { name: 'Community Support', number: '0945 685 2439' },
  { name: 'Local Hospital', number: '0945 685 2440' },
  { name: 'Local Clinic', number: '0945 685 2441' },
  { name: 'Veterinary Services', number: '0945 685 2442' },
  // Add more contacts as needed
];

export default function ContactScreen() {
  const handleCall = (number) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleSMS = (number) => {
    Linking.openURL(`sms:${number}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Contacts</Text>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.number}
        renderItem={({ item }) => (
          <View style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactNumber}>{item.number}</Text>
            </View>
            <View style={styles.iconRow}>
              <TouchableOpacity onPress={() => handleSMS(item.number)} style={styles.iconButton}>
                <Icon name="chatbubble-ellipses-outline" size={28} color="#49A5A2" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleCall(item.number)} style={styles.iconButton}>
                <Icon name="call-outline" size={28} color="#e75e33" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    padding: 14,
    elevation: 2,
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  contactNumber: { fontSize: 16, color: '#666', marginTop: 2 },
  iconRow: { flexDirection: 'row' },
  iconButton: { marginLeft: 18 },
});
