// screens/AddScheduleScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from '../services/supabaseClient'; // adjust path if your supabase client is exported elsewhere
import { notifyUsers } from '../services/notification';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase"; // adjust path if needed


export default function AddScheduleScreen({ navigation, route }) {
  const { onSave } = route.params || {};

  const [newSchedule, setNewSchedule] = useState({
    title: "",
    date: new Date(),
    time: new Date(),
    location: "",
    purok: "", // Add purok field
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [barangayList, setBarangayList] = useState([]);
  const [barangayModalVisible, setBarangayModalVisible] = useState(false);

  // NEW: purok state
  const [purokList, setPurokList] = useState([]);
  const [purokModalVisible, setPurokModalVisible] = useState(false);

  useEffect(() => {
    // Fetch barangay list from Firestore
    const fetchBarangays = async () => {
      try {
        const snap = await getDocs(collection(db, "barangays"));
        const list = [];
        snap.forEach(doc => {
          const data = doc.data();
          if (data.name) list.push(data.name);
        });
        setBarangayList(list);
      } catch (error) {
        console.log("Failed to fetch barangays:", error);
      }
    };
    fetchBarangays();
  }, []);

  // Fetch purok list when barangay changes
  useEffect(() => {
    const fetchPuroks = async () => {
      if (!newSchedule.title) {
        setPurokList([]);
        setNewSchedule((prev) => ({ ...prev, purok: "" }));
        return;
      }
      try {
        // Assuming each barangay document has a subcollection "puroks"
        const barangayQuery = query(
          collection(db, "barangays"),
          where("name", "==", newSchedule.title)
        );
        const barangaySnap = await getDocs(barangayQuery);
        if (!barangaySnap.empty) {
          const barangayDoc = barangaySnap.docs[0];
          const puroksSnap = await getDocs(
            collection(barangayDoc.ref, "puroks")
          );
          const list = [];
          puroksSnap.forEach((doc) => {
            const data = doc.data();
            if (data.name) list.push(data.name);
          });
          setPurokList(list);
        } else {
          setPurokList([]);
        }
        setNewSchedule((prev) => ({ ...prev, purok: "" }));
      } catch (error) {
        console.log("Failed to fetch puroks:", error);
        setPurokList([]);
        setNewSchedule((prev) => ({ ...prev, purok: "" }));
      }
    };
    fetchPuroks();
  }, [newSchedule.title]);

  // Pick file (allow Excel .xlsx / .xls and CSV). Handles different DocumentPicker return shapes.
  const pickDocument = async () => {
    try {
      console.log("open DocumentPicker...");
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });

      console.log("DocumentPicker result:", res);

      // Newer API (Expo) returns { assets: [...], canceled: boolean }
      if (res?.assets && Array.isArray(res.assets) && res.assets.length > 0) {
        const asset = res.assets[0];
        const uri = asset.uri;
        const name = asset.name || asset.fileName || uri.split("/").pop();
        const mimeType = asset.mimeType || asset.type || "application/octet-stream";
        const fileObj = { uri, name, type: mimeType };
        console.log("Picked file (assets):", fileObj);
        setSelectedFile(fileObj);
        return;
      }

      // Older shape: { type: 'success', uri, name, mimeType }
      if (res && res.type === "success") {
        const uri = res.uri;
        const name = res.name || res.fileName || uri.split("/").pop();
        const mimeType = res.mimeType || res.type || "application/octet-stream";
        const fileObj = { uri, name, type: mimeType };
        console.log("Picked file (legacy):", fileObj);
        setSelectedFile(fileObj);
        return;
      }

      // User cancelled (various shapes)
      if (res?.canceled === true || res?.type === "cancel" || res?.type === "cancelled") {
        console.log("DocumentPicker cancelled by user");
        Alert.alert("No file selected", "You cancelled file selection.");
        return;
      }

      console.log("Unknown DocumentPicker response:", res);
      Alert.alert("File picker", "No file selected.");
    } catch (err) {
      console.error("DocumentPicker error:", err);
      if (Platform.OS === "android") {
        Alert.alert(
          "File picker error",
          "Unable to open file picker. If you're using an Android emulator, try a real device (or install a file manager). Make sure expo-document-picker is installed (expo install expo-document-picker).\n\nError: " +
            (err?.message || String(err))
        );
      } else {
        Alert.alert("Error", "Unable to pick file. " + (err?.message || ""));
      }
    }
  };

  const handleSave = () => {
    if (!newSchedule.title || !newSchedule.location) {
      Alert.alert("Error", "Please fill out all required fields!");
      return;
    }
  };

  // New: upload file (if any) and insert schedule into Supabase
  const handleAddSchedule = async () => {
    if (!newSchedule.title || !newSchedule.location) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      let fileUrl = null;
      let fileName = null;

      if (selectedFile) {
        try {
          const fileExt = selectedFile.name.split(".").pop();
          const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          const filePath = `schedules/${uniqueFileName}`;

          // On Android content:// URIs and iOS file:// URIs both work with fetch -> blob
          // const response = await fetch(selectedFile.uri);
          // const blob = await response.blob();
          //
          // const { data: uploadData, error: uploadError } = await supabase.storage
          //   .from("schedule-files")
          //   .upload(filePath, blob);
          //
          // if (uploadError) throw uploadError;
          //
          // const { data: urlData } = supabase.storage
          //   .from("schedule-files")
          //   .getPublicUrl(filePath);
          //
          // fileUrl = urlData?.publicUrl || null;
          // fileName = selectedFile.name;
          // } catch (fileError) {
          //   console.error("File upload error:", fileError);
          //   throw fileError;
          // }

          // Fetch file, convert to ArrayBuffer -> Uint8Array (works reliably with supabase-js in RN)
          const response = await fetch(selectedFile.uri);
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Use a simple filename (you may keep folders if you prefer)
          const uploadName = uniqueFileName; // e.g. "166xxx_abcd.xlsx"

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("schedule-files")
            .upload(uploadName, uint8Array, {
              contentType: selectedFile.type || "application/octet-stream",
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            console.error("Supabase upload error detail:", uploadError);
            throw uploadError;
          }

          const { data: urlData } = await supabase.storage
            .from("schedule-files")
            .getPublicUrl(uploadName);

          fileUrl = urlData?.publicUrl || null;
          fileName = selectedFile.name;
        } catch (fileError) {
          console.error("File upload error:", fileError);
          throw fileError;
        }
      }

      const formattedTime = newSchedule.time.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const { data, error } = await supabase
        .from("food_schedules")
        .insert([
          {
            title: newSchedule.title,
            date: newSchedule.date.toISOString().split("T")[0],
            time: formattedTime,
            location: newSchedule.location,
            purok: newSchedule.purok, // <-- ADD THIS LINE
            file_url: fileUrl,
            file_name: fileName,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const newItem = {
        id: data.id,
        title: data.title,
        date: new Date(data.date).toLocaleDateString(),
        time: data.time,
        location: data.location,
        fileUrl: data.file_url,
        fileName: data.file_name,
      };

      // If parent provided onSave callback, call it
      if (onSave) onSave(newItem);

      // reset and navigate back
      setNewSchedule({
        title: "",
        date: new Date(),
        time: new Date(),
        location: "",
      });
      setSelectedFile(null);

      // Send notification to users (best-effort)
      try {
        const notificationMessage =
          `[Kalinga App]\nNew Food Distribution Schedule\n` +
          `Barangay: ${newItem.title}\n` +
          `Date: ${newItem.date}\n` +
          `Time: ${newItem.time}\n` +
          `Location: ${newItem.location}`;

        const notifyResult = await notifyUsers(notificationMessage);
        console.log("notifyUsers result:", notifyResult);
      } catch (notifyErr) {
        console.error("Notification error:", notifyErr);
      }

      Alert.alert("Success", "New schedule added successfully!");
      navigation.goBack();
    } catch (error) {
      console.error("Error adding schedule:", error);
      Alert.alert("Error", error?.message || "Failed to add schedule");
    }
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
          {/* Barangay Selector */}
          <View style={styles.input}>
            <Text style={{ marginBottom: 5, color: "#333" }}>Select Barangay</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setBarangayModalVisible(true)}
            >
              <Text style={{ color: newSchedule.title ? "#333" : "#aaa" }}>
                {newSchedule.title || "Select Barangay"}
              </Text>
              <Icon name="chevron-down" size={20} color="#333" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>

          {/* Barangay Modal */}
          <Modal
            visible={barangayModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setBarangayModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Choose Barangay</Text>
                <FlatList
                  data={barangayList}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setNewSchedule({ ...newSchedule, title: item, purok: "" }); // <-- Reset purok when barangay changes
                        setBarangayModalVisible(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setBarangayModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* NEW: Purok Selector */}
          <View style={styles.input}>
            <Text style={{ marginBottom: 5, color: "#333" }}>Select Purok</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setPurokModalVisible(true)}
              disabled={!newSchedule.title}
            >
              <Text style={{ color: newSchedule.purok ? "#333" : "#aaa" }}>
                {newSchedule.purok || (newSchedule.title ? "Select Purok" : "Select Barangay first")}
              </Text>
              <Icon name="chevron-down" size={20} color="#333" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>

          {/* Purok Modal */}
          <Modal
            visible={purokModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setPurokModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Choose Purok</Text>
                <FlatList
                  data={purokList}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setNewSchedule({ ...newSchedule, purok: item });
                        setPurokModalVisible(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setPurokModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

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
              onPress={pickDocument}
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
              onPress={handleAddSchedule}
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
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 15,
  },
  picker: {
    height: 48,
    width: "100%",
    color: "#333",
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 5,
    justifyContent: "space-between",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#e75e33",
    textAlign: "center",
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalItemText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: "#e75e33",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});