import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabaseClient";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { WebView } from "react-native-webview";
import * as XLSX from "xlsx";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

export default function ManageSchedule({ navigation }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    title: "",
    date: new Date(),
    time: new Date(),
    location: "",
  });
  const [schedulesList, setSchedulesList] = useState([]); // Changed from schedules to empty array
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileViewerVisible, setFileViewerVisible] = useState(false);
  const [selectedFileUrl, setSelectedFileUrl] = useState(null);
  const [excelContent, setExcelContent] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchSchedules();
  }, []);

  // Add this after your existing useEffect
  useEffect(() => {
    checkAdminStatus(); // Initial check

    // Listen for storage changes
    const unsubscribe = navigation.addListener("focus", () => {
      checkAdminStatus(); // Check when screen comes into focus
    });

    return unsubscribe;
  }, [navigation]);

  const checkAdminStatus = async () => {
    try {
      const userInfo = await AsyncStorage.getItem("userInfo");
      const user = await AsyncStorage.getItem("user");

      if (userInfo && user) {
        const parsedInfo = JSON.parse(userInfo);
        setIsLoggedIn(true);
        setIsAdmin(parsedInfo.isAdmin === true); // Strict boolean check
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsLoggedIn(false);
      setIsAdmin(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("food_schedules")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;

      const schedules = data.map((item) => ({
        id: item.id,
        title: item.title,
        date: new Date(item.date).toLocaleDateString(),
        time: item.time,
        location: item.location,
        fileUrl: item.file_url,
        fileName: item.file_name,
      }));

      setSchedulesList(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      Alert.alert("Error", "Failed to load schedules");
    }
  };

  // Update the handleFilePick function
  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile({
          name: file.name,
          uri: file.uri,
          type: file.mimeType,
        });
      }
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Error", "Failed to pick file");
    }
  };

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

          // Create form data for file upload
          const formData = new FormData();
          formData.append("file", {
            uri: selectedFile.uri,
            name: selectedFile.name,
            type: selectedFile.type,
          });

          // Upload file using fetch
          const { data, error: uploadError } = await supabase.storage
            .from("schedule-files")
            .upload(filePath, formData);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("schedule-files")
            .getPublicUrl(filePath);

          fileUrl = urlData.publicUrl;
          fileName = selectedFile.name;
        } catch (fileError) {
          console.error("File upload error:", fileError);
          throw fileError;
        }
      }

      // Continue with schedule creation
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
            file_url: fileUrl,
            file_name: fileName,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Update local state and reset form
      const newItem = {
        id: data.id,
        title: data.title,
        date: new Date(data.date).toLocaleDateString(),
        time: data.time,
        location: data.location,
        fileUrl: data.file_url,
        fileName: data.file_name,
      };

      setSchedulesList([...schedulesList, newItem]);
      setModalVisible(false);
      setNewSchedule({
        title: "",
        date: new Date(),
        time: new Date(),
        location: "",
      });
      setSelectedFile(null);
      Alert.alert("Success", "New schedule added successfully!");
    } catch (error) {
      console.error("Error adding schedule:", error);
      Alert.alert("Error", error.message);
    }
  };

  // Update the handleDeleteSchedule function
  const handleDeleteSchedule = async (id) => {
    try {
      Alert.alert(
        "Delete Schedule",
        "Are you sure you want to delete this schedule?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                // First, get the schedule to delete
                const { data: schedule, error: fetchError } = await supabase
                  .from("food_schedules")
                  .select("*")
                  .eq("id", id)
                  .single();

                if (fetchError) {
                  console.error("Error fetching schedule:", fetchError);
                  throw fetchError;
                }

                // Delete associated file if exists
                if (schedule?.file_url) {
                  try {
                    const fileName =
                      schedule.file_url.split("schedule-files/")[1];
                    if (fileName) {
                      await supabase.storage
                        .from("schedule-files")
                        .remove([fileName]);
                    }
                  } catch (fileError) {
                    console.error("Error deleting file:", fileError);
                    // Continue with schedule deletion even if file deletion fails
                  }
                }

                // Delete the schedule
                const { error: deleteError } = await supabase
                  .from("food_schedules")
                  .delete()
                  .eq("id", id);

                if (deleteError) {
                  console.error("Error deleting schedule:", deleteError);
                  throw deleteError;
                }

                // Update local state
                setSchedulesList((prevList) =>
                  prevList.filter((item) => item.id !== id)
                );
                Alert.alert("Success", "Schedule deleted successfully!");
              } catch (error) {
                console.error("Delete operation failed:", error);
                Alert.alert("Error", "Failed to delete schedule");
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in delete operation:", error);
      Alert.alert("Error", "Failed to delete schedule");
    }
  };

  // Update the handleEditSchedule function
  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);

    // Convert date string to Date object
    const [month, day, year] = schedule.date.split("/");
    const dateObj = new Date(year, month - 1, day);

    // Convert time string to Date object
    const [hours, minutes] = schedule.time.split(":");
    const timeObj = new Date();
    timeObj.setHours(parseInt(hours));
    timeObj.setMinutes(parseInt(minutes));

    setNewSchedule({
      title: schedule.title,
      date: dateObj,
      time: timeObj,
      location: schedule.location,
    });

    setSelectedFile(
      schedule.fileName
        ? {
            name: schedule.fileName,
            uri: schedule.fileUrl,
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        : null
    );

    setIsEditMode(true);
    setModalVisible(true);
  };

  // Add real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel("food_schedules_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_schedules",
        },
        (payload) => {
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const parseExcelFile = async (fileUrl) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        setExcelContent(jsonData);
      };

      reader.readAsArrayBuffer(blob);
    } catch (error) {
      console.error("Error parsing Excel:", error);
      Alert.alert("Error", "Failed to read Excel file");
    }
  };

  const handleSaveSchedule = async () => {
    if (!newSchedule.title || !newSchedule.location) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      let fileUrl = null;
      let fileName = null;

      // Update the handleSaveSchedule function's file upload section
      if (
        selectedFile &&
        (!isEditMode || selectedFile.uri !== editingSchedule?.fileUrl)
      ) {
        try {
          // Create unique file name
          const fileExt = selectedFile.name.split(".").pop();
          const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

          // Get the file data as blob
          const response = await fetch(selectedFile.uri);
          const blob = await response.blob();

          // Read blob as array buffer
          const arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
          });

          // Convert to Uint8Array
          const uint8Array = new Uint8Array(arrayBuffer);

          // Upload to Supabase
          const { data, error: uploadError } = await supabase.storage
            .from("schedule-files")
            .upload(uniqueFileName, uint8Array, {
              contentType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              upsert: false,
            });

          if (uploadError) {
            console.error("Upload error details:", uploadError);
            throw uploadError;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("schedule-files")
            .getPublicUrl(uniqueFileName);

          if (!urlData?.publicUrl) {
            throw new Error("Failed to get public URL");
          }

          fileUrl = urlData.publicUrl;
          fileName = selectedFile.name;
        } catch (fileError) {
          console.error("File upload error details:", fileError);
          if (isEditMode) {
            fileUrl = editingSchedule.fileUrl;
            fileName = editingSchedule.fileName;
          } else {
            Alert.alert("Error", "Failed to upload file. Please try again.");
            return;
          }
        }
      } else if (isEditMode) {
        fileUrl = editingSchedule.fileUrl;
        fileName = editingSchedule.fileName;
      }

      const formattedTime = newSchedule.time.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (isEditMode && editingSchedule) {
        // Update existing schedule
        const { data, error } = await supabase
          .from("food_schedules")
          .update({
            title: newSchedule.title,
            date: newSchedule.date.toISOString().split("T")[0],
            time: formattedTime,
            location: newSchedule.location,
            file_url: fileUrl,
            file_name: fileName,
          })
          .eq("id", editingSchedule.id)
          .select()
          .single();

        if (error) {
          console.error("Update error:", error);
          throw error;
        }

        // Update local state with the updated data
        setSchedulesList((prevList) =>
          prevList.map((item) =>
            item.id === editingSchedule.id
              ? {
                  ...item,
                  title: data.title,
                  date: new Date(data.date).toLocaleDateString(),
                  time: data.time,
                  location: data.location,
                  fileUrl: data.file_url,
                  fileName: data.file_name,
                }
              : item
          )
        );

        Alert.alert("Success", "Schedule updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("food_schedules")
          .insert([
            {
              title: newSchedule.title,
              date: newSchedule.date.toISOString().split("T")[0],
              time: formattedTime,
              location: newSchedule.location,
              file_url: fileUrl,
              file_name: fileName,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        // Update local state and reset form
        const newItem = {
          id: data.id,
          title: data.title,
          date: new Date(data.date).toLocaleDateString(),
          time: data.time,
          location: data.location,
          fileUrl: data.file_url,
          fileName: data.file_name,
        };

        setSchedulesList([...schedulesList, newItem]);
      }

      setModalVisible(false);
      setNewSchedule({
        title: "",
        date: new Date(),
        time: new Date(),
        location: "",
      });
      setSelectedFile(null);
      setIsEditMode(false);
      setEditingSchedule(null);
      Alert.alert(
        "Success",
        `Schedule ${isEditMode ? "updated" : "added"} successfully!`
      );
    } catch (error) {
      console.error("Error saving schedule:", error);
      Alert.alert("Error", "Failed to save schedule. Please try again.");
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchSchedules();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Manage Schedules</Text>

        {/* Placeholder to balance layout */}
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.container}>
        <FlatList
          data={schedulesList}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16 }}
          renderItem={({ item }) => (
            <View style={styles.cardRow}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardText}>📅 {item.date}</Text>
                <Text style={styles.cardText}>⏰ {item.time}</Text>
                <Text style={styles.cardText}>📍 {item.location}</Text>
                {item.fileUrl && (
                  <TouchableOpacity
                    style={styles.fileLink}
                    onPress={() => {
                      setSelectedFileUrl(item.fileUrl);
                      setFileViewerVisible(true);
                      parseExcelFile(item.fileUrl);
                    }}
                  >
                    <Icon name="document-text" size={16} color="#e75e33" />
                    <Text style={styles.fileLinkText}>View List of Names</Text>
                  </TouchableOpacity>
                )}
              </View>
              {isLoggedIn && isAdmin ? (
                <View style={styles.adminActions}>
                  <TouchableOpacity
                    onPress={() => handleEditSchedule(item)}
                    style={styles.actionButton}
                  >
                    <Icon name="create-outline" size={22} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteSchedule(item.id)}
                    style={styles.actionButton}
                  >
                    <Icon name="trash-outline" size={22} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        />

        {isLoggedIn && isAdmin ? (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => navigation.navigate("AddSchedule")}
          >
            <Icon name="add" size={30} color="#fff" />
            {/* <Text style={styles.adminButtonText}>Add New Schedule</Text> */}
          </TouchableOpacity>
        ) : null}

        {isAdmin && (
          <Modal
            animationType="fade" // Changed from "slide" to "fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View
              style={[
                styles.modalOverlay,
                { opacity: modalVisible ? 1 : 0 }, // Add fade effect
              ]}
            >
              <View
                style={[
                  styles.modalContent,
                  { transform: [{ scale: modalVisible ? 1 : 0.9 }] }, // Add scale effect
                ]}
              >
                <Text style={styles.modalTitle}>
                  {isEditMode ? "Edit Schedule" : "Add New Schedule"}
                </Text>

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
                  <Text style={styles.fileLabel}>
                    List of Names (Excel File)
                  </Text>
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

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleSaveSchedule}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {fileViewerVisible && selectedFileUrl && (
          <Modal
            animationType="fade"
            transparent={true}
            visible={fileViewerVisible}
            onRequestClose={() => setFileViewerVisible(false)}
          >
            <View
              style={[
                styles.fileViewerModal,
                { transform: [{ translateY: 0 }] }, // Add slide-up effect
              ]}
            >
              <View style={styles.fileViewerHeader}>
                <Text style={styles.fileViewerTitle}>Beneficiaries List</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFileViewerVisible(false);
                    setExcelContent(null);
                  }}
                >
                  <Icon name="close-outline" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.excelContainer}>
                {excelContent ? (
                  <ScrollView style={styles.excelContent}>
                    {excelContent.map((row, rowIndex) => (
                      <View
                        key={rowIndex}
                        style={[
                          styles.excelRow,
                          rowIndex === 0 && styles.headerRow,
                        ]}
                      >
                        {row.map((cell, cellIndex) => (
                          <Text
                            key={`${rowIndex}-${cellIndex}`}
                            style={[
                              styles.excelCell,
                              rowIndex === 0 && styles.excelHeader,
                              cellIndex === 0 && styles.firstColumn,
                            ]}
                          >
                            {cell}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#e75e33" />
                    <Text style={styles.loadingText}>Loading list...</Text>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 5,
    zIndex: 10,
  },
  backButton: {
    padding: 4,
    marginRight: 6,
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    // paddingTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
    textAlign: "center",
  },
  info: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginTop: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    justifyContent: "space-between",
  },
  cardInfo: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "black",
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  cardImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  adminButton: {
    position: "absolute",
    bottom: 40, // Changed from 20 to 40 to elevate it higher
    right: 15,
    backgroundColor: "#49A5A2",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  adminButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#e75e33",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  dateButton: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
  },
  fileSection: {
    marginBottom: 16,
  },
  fileLabel: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  fileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  fileButtonSelected: {
    backgroundColor: "#e7f3ff",
    borderColor: "#1976D2",
    borderStyle: "solid",
  },
  fileButtonText: {
    fontSize: 16,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  selectedFileInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  selectedFileText: {
    color: "#4CAF50",
    marginLeft: 4,
    flex: 1,
  },
  removeFileButton: {
    padding: 4,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 0.45,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#e75e33",
  },
  cancelButton: {
    backgroundColor: "#999",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  fileLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  fileLinkText: {
    color: "#3378e7ff",
    marginLeft: 4,
    textDecorationLine: "underline",
  },
  fileViewerModal: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  fileViewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#e75e33",
    elevation: 2,
  },
  fileViewerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  closeButton: {
    padding: 8,
  },
  webview: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  excelContent: {
    flex: 1,
  },
  excelRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  excelCell: {
    flex: 1,
    fontSize: 15,
    color: "#444",
    paddingHorizontal: 8,
  },
  excelHeader: {
    fontWeight: "600",
    color: "#e75e33",
  },
  excelContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerRow: {
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  firstColumn: {
    minWidth: 50,
  },
  adminActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingLeft: 10,
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
});