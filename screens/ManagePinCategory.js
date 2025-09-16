import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";

const ICON_OPTIONS = [
  { label: "Water", value: "tint" },
  { label: "Medical", value: "hospital" },
  { label: "First Aid", value: "briefcase-medical" },
  { label: "Charging", value: "charging-station" },
  { label: "Wi-Fi", value: "wifi" },
  { label: "Clothing", value: "tshirt" },
  { label: "Blankets", value: "bed" },
  { label: "Animal", value: "paw" },
  { label: "Shelter", value: "home" },
  { label: "Rescue", value: "life-ring" },
  { label: "Sanitation", value: "shower" },
  { label: "Toilets", value: "toilet" },
  { label: "Food", value: "utensils" },
  { label: "Fire", value: "fire" },
  { label: "School", value: "school" },
  { label: "Store", value: "store" },
  { label: "Phone", value: "phone" },
  { label: "Map", value: "map-marker-alt" },
  { label: "Flag", value: "flag" },
  { label: "Star", value: "star" },
];

const COLOR_OPTIONS = [
  { label: "Blue", value: "#2196F3" },
  { label: "Red", value: "#F44336" },
  { label: "Orange", value: "#FF9800" },
  { label: "Purple", value: "#9C27B0" },
  { label: "Cyan", value: "#00BCD4" },
  { label: "Brown", value: "#795548" },
  { label: "Gray", value: "#607D8B" },
  { label: "Green", value: "#8BC34A" },
  { label: "Deep Orange", value: "#FF5722" },
  { label: "Pink", value: "#E91E63" },
  { label: "Teal", value: "#009688" },
  { label: "Indigo", value: "#3F51B5" },
  { label: "Yellow", value: "#FFEB3B" },
  { label: "Light Green", value: "#AED581" },
  { label: "Light Blue", value: "#03A9F4" },
  { label: "Deep Purple", value: "#673AB7" },
  { label: "Lime", value: "#CDDC39" },
  { label: "Amber", value: "#FFC107" },
  { label: "Black", value: "#222" },
  { label: "Default", value: "#888" },
];

export default function ManageCategory() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("question");
  const [newColor, setNewColor] = useState("#888");
  const navigation = useNavigation();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "categories"));
      const list = snap.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
      setCategories(list);
    } catch (error) {
      console.log("Failed to fetch categories:", error);
    }
    setLoading(false);
  };

  const handleAddCategory = async () => {
    if (!newName.trim()) {
      Alert.alert("Missing Info", "Please enter a category name.");
      return;
    }
    try {
      const docRef = await addDoc(collection(db, "categories"), {
        name: newName.trim(),
        icon: newIcon,
        color: newColor,
      });
      setCategories((prev) => [
        ...prev,
        { id: docRef.id, name: newName.trim(), icon: newIcon, color: newColor },
      ]);
      setAdding(false);
      setNewName("");
      setNewIcon("question");
      setNewColor("#888");
    } catch (e) {
      Alert.alert("Error", "Failed to add category.");
    }
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setNewName(category.name);
    setNewIcon(category.icon || "question");
    setNewColor(category.color || "#888");
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!newName.trim()) {
      Alert.alert("Missing Info", "Please enter a category name.");
      return;
    }
    try {
      await updateDoc(doc(db, "categories", selectedCategory.id), {
        name: newName.trim(),
        icon: newIcon,
        color: newColor,
      });
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === selectedCategory.id
            ? { ...cat, name: newName.trim(), icon: newIcon, color: newColor }
            : cat
        )
      );
      setEditing(false);
      setSelectedCategory(null);
      setNewName("");
      setNewIcon("question");
      setNewColor("#888");
    } catch (e) {
      Alert.alert("Error", "Failed to update category.");
    }
  };

  const handleDeleteCategory = (categoryId) => {
    Alert.alert(
      "Delete Category",
      "Are you sure you want to delete this category?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "categories", categoryId));
              setCategories((prev) =>
                prev.filter((cat) => cat.id !== categoryId)
              );
            } catch (e) {
              Alert.alert("Error", "Failed to delete category.");
            }
          },
        },
      ]
    );
  };

  const renderIconPicker = (selected, setSelected) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
      {ICON_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.iconOption,
            selected === opt.value && styles.selectedIconOption,
          ]}
          onPress={() => setSelected(opt.value)}
        >
          <FontAwesome5 name={opt.value} size={22} color="#444" />
          <Text style={{ fontSize: 11 }}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderColorPicker = (selected, setSelected) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
      {COLOR_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.colorOption,
            { backgroundColor: opt.value },
            selected === opt.value && styles.selectedColorOption,
          ]}
          onPress={() => setSelected(opt.value)}
        >
          {selected === opt.value && (
            <Icon name="checkmark" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCategoryItem = ({ item }) => {
    const renderRightActions = () => (
      <TouchableOpacity
        style={{
          backgroundColor: "#ff4444",
          justifyContent: "center",
          alignItems: "center",
          width: 60,
          borderRadius: 12,
          marginLeft: 10,
          height: "85%",

        }}
        onPress={() => handleDeleteCategory(item.id)}
      >
        <Icon name="trash-outline" size={22} color="#fff" />
        {/* <Text style={{ color: "#fff", fontWeight: "bold", marginTop: 2 }}>
          Delete
        </Text> */}
      </TouchableOpacity>
    );

    return (
      <Swipeable renderRightActions={renderRightActions}>
        <View style={styles.categoryCard}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FontAwesome5
              name={item.icon || "question"}
              size={22}
              color={item.color || "#888"}
              style={{ marginRight: 10 }}
            />
            <Text
              style={[styles.categoryName, { color: item.color || "#333" }]}
            >
              {item.name}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleEditCategory(item)}
          >
            <Icon name="create-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage Category</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#e75e33" />
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={renderCategoryItem}
          />
        )}
      </View>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setAdding(true)}>
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Add Category Modal */}
      <Modal visible={adding} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Add New Category</Text>
              <TextInput
                placeholder="Category Name"
                value={newName}
                onChangeText={setNewName}
                style={styles.addInput}
              />
              <Text style={{ marginBottom: 5, fontWeight: "bold" }}>Icon</Text>
              {renderIconPicker(newIcon, setNewIcon)}
              <Text style={{ marginBottom: 5, fontWeight: "bold" }}>Color</Text>
              {renderColorPicker(newColor, setNewColor)}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => {
                    setAdding(false);
                    setNewName("");
                    setNewIcon("question");
                    setNewColor("#888");
                  }}
                  style={styles.modalButtonCancel}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddCategory}
                  style={styles.modalButtonSave}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Category Modal */}
      <Modal visible={editing} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Edit Category</Text>
              <TextInput
                placeholder="Category Name"
                value={newName}
                onChangeText={setNewName}
                style={styles.addInput}
              />
              <Text style={{ marginBottom: 5, fontWeight: "bold" }}>Icon</Text>
              {renderIconPicker(newIcon, setNewIcon)}
              <Text style={{ marginBottom: 5, fontWeight: "bold" }}>Color</Text>
              {renderColorPicker(newColor, setNewColor)}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => {
                    setEditing(false);
                    setSelectedCategory(null);
                    setNewName("");
                    setNewIcon("question");
                    setNewColor("#888");
                  }}
                  style={styles.modalButtonCancel}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  style={styles.modalButtonSave}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
  },
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  categoryCard: {
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryName: { fontSize: 17, fontWeight: "bold", color: "#333" },
  actionRow: { flexDirection: "row" },
  actionBtn: { marginLeft: 16 },
  fab: {
    position: "absolute",
    bottom: "6%",
    right: 20,
    backgroundColor: "#49A5A2",
    width: 55,
    height: 55,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "98%",
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  addInput: {
    borderBottomWidth: 1,
    borderColor: "#ccc",
    fontSize: 16,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    borderRadius: 6,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  modalButtonSave: {
    backgroundColor: "#49A5A2",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonCancel: {
    backgroundColor: "#999",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 8,
  },
  modalButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  iconOption: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    margin: 4,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#f9f9f9",
  },
  selectedIconOption: { borderColor: "#e75e33", backgroundColor: "#ffe5d0" },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    margin: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  selectedColorOption: { borderColor: "#e75e33", borderWidth: 3 },
});
