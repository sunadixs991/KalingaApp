import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { supabase } from "../services/supabaseClient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

export default function FoodDistribution({ navigation }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [schedulesList, setSchedulesList] = useState([]);
  const [selectedFileUrl, setSelectedFileUrl] = useState(null);
  const [fileViewerVisible, setFileViewerVisible] = useState(false);
  const [excelContent, setExcelContent] = useState(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchSchedules();
    }, [])
  );

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
        purok: item.purok, // <-- Add purok field
        fileUrl: item.file_url,
        fileName: item.file_name,
      }));

      setSchedulesList(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      Alert.alert("Error", "Failed to load schedules");
    }
  };

  const parseExcelFile = async (fileUrl) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const XLSX = require("xlsx");
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Food Distribution Schedules</Text>
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
                {item.purok && (
                  <Text style={styles.cardText}>🏘️ Purok: {item.purok}</Text>
                )}
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
            </View>
          )}
        />

        {fileViewerVisible && selectedFileUrl && (
          <Modal
            animationType="fade"
            transparent={true}
            visible={fileViewerVisible}
            onRequestClose={() => setFileViewerVisible(false)}
          >
            <View style={styles.fileViewerModal}>
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
    backgroundColor: "#ffffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
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
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    backgroundColor: "#f8ecd3ff",
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
  excelContainer: {
    flex: 1,
    backgroundColor: "#fff",
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
  headerRow: {
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  firstColumn: {
    minWidth: 50,
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
});