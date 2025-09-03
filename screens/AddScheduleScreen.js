// screens/AddScheduleScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddScheduleScreen({ navigation, route }) {
  const { onSave } = route.params || {};

  const [newSchedule, setNewSchedule] = useState({
    title: "",
    date: new Date(),
    time: new Date(),
    location: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      if (result.type === "success") {
        setSelectedFile(result);
      }
    } catch (error) {
      console.error("File selection error:", error);
    }
  };

  const handleSave = () => {
    if (!newSchedule.title || !newSchedule.location) {
      alert("Please fill out all required fields!");
      return;
    }

    if (onSave) {
      onSave({
        ...newSchedule,
        file: selectedFile,
      });
    }

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar backgroundColor="#e75e33" barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Schedule</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TextInput
            style={styles.input}
            placeholder="Barangay Name"
            value={newSchedule.title}
            onChangeText={(text) =>
              setNewSchedule({ ...newSchedule, title: text })
            }
          />

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              Select Date: {newSchedule.date.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={newSchedule.date}
              mode="date"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setNewSchedule({ ...newSchedule, date: selectedDate });
                }
              }}
            />
          )}

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              Select Time: {newSchedule.time.toLocaleTimeString()}
            </Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={newSchedule.time}
              mode="time"
              onChange={(event, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) {
                  setNewSchedule({ ...newSchedule, time: selectedTime });
                }
              }}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Location"
            value={newSchedule.location}
            onChangeText={(text) =>
              setNewSchedule({ ...newSchedule, location: text })
            }
          />

          <View style={styles.fileSection}>
            <Text style={styles.fileLabel}>List of Names (Excel File)</Text>
            <TouchableOpacity
              style={[
                styles.fileButton,
                selectedFile && styles.fileButtonSelected,
              ]}
              onPress={handleFilePick}
            >
              <Icon name="document-attach" size={24} color="#666" />
              <Text style={styles.fileButtonText} numberOfLines={1}>
                {selectedFile ? selectedFile.name : "Select Excel File"}
              </Text>
            </TouchableOpacity>

            {selectedFile && (
              <View style={styles.selectedFileInfo}>
                <Icon name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.selectedFileText}>File selected</Text>
                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={() => setSelectedFile(null)}
                >
                  <Icon name="close-circle" size={20} color="#FF5252" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            {/* <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity> */}
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 12,
    color: "#333",
  },
  scrollContent: { padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  dateButton: {
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 15,
  },
  dateButtonText: { fontSize: 16, color: "#333" },
  fileSection: { marginTop: 15, marginBottom: 20 },
  fileLabel: { fontSize: 14, marginBottom: 8, fontWeight: "600" },
  fileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  fileButtonSelected: { borderColor: "#4CAF50" },
  fileButtonText: { marginLeft: 8, fontSize: 14, color: "#333", flexShrink: 1 },
  selectedFileInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  selectedFileText: { marginLeft: 5, color: "#4CAF50" },
  removeFileButton: { marginLeft: 8 },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: { backgroundColor: "#999" },
  saveButton: { backgroundColor: "#e75e33" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
