import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    TextInput,
    Alert,
    FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../firebase";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import { Swipeable } from "react-native-gesture-handler";

export default function ManageLandmark() {
    const navigation = useNavigation();
    const [landmark, setLandmark] = useState("");
    const [loading, setLoading] = useState(false);
    const [landmarks, setLandmarks] = useState([]);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchLandmarks();
    }, []);

    const fetchLandmarks = async () => {
        const querySnapshot = await getDocs(collection(db, "landmarks"));
        const fetched = querySnapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
        }));
        fetched.sort((a, b) => a.name.localeCompare(b.name));
        setLandmarks(fetched);
    };

    const handleSaveLandmark = async () => {
        if (!landmark.trim()) {
            Alert.alert("Error", "Please enter a landmark name.");
            return;
        }
        setLoading(true);
        try {
            if (editingId) {
                await updateDoc(doc(db, "landmarks", editingId), {
                    name: landmark.trim(),
                });
                setEditingId(null);
            } else {
                await addDoc(collection(db, "landmarks"), {
                    name: landmark.trim(),
                    createdAt: serverTimestamp(),
                });
            }
            setLandmark("");
            fetchLandmarks();
            Alert.alert("Success", "Landmark saved!");
        } catch (error) {
            Alert.alert("Error", "Failed to save landmark.");
        }
        setLoading(false);
    };

    const handleDeleteLandmark = async (id) => {
        await deleteDoc(doc(db, "landmarks", id));
        fetchLandmarks();
    };

    const handleEditLandmark = (item) => {
        setLandmark(item.name);
        setEditingId(item.id);
    };

    // Right swipe: delete
    const renderRightActions = (onDelete) => (
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <Icon name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
    );

    // Left swipe: edit
    const renderLeftActions = (onEdit) => (
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <Icon name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>
    );

    const renderLandmarkItem = ({ item }) => (
        <Swipeable
            renderRightActions={() => renderRightActions(() => handleDeleteLandmark(item.id))}
            renderLeftActions={() => renderLeftActions(() => handleEditLandmark(item))}
        >
            <View style={styles.landmarkRow}>
                <Text style={styles.landmarkName}>{item.name}</Text>
            </View>
        </Swipeable>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <StatusBar barStyle="light-content" backgroundColor="#49A5A2" />
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="chevron-back" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Manage Landmark</Text>
                <View style={styles.backButton} />
            </View>
            <View style={styles.container}>
                <Text style={styles.label}>
                    {editingId ? "Edit Landmark Name:" : "Enter Landmark Name:"}
                </Text>
                <TextInput
                    style={styles.input}
                    placeholder="Type landmark here..."
                    value={landmark}
                    onChangeText={setLandmark}
                />
                <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveLandmark}
                    disabled={loading}
                >
                    <Text style={styles.saveBtnText}>
                        {loading ? "Saving..." : editingId ? "Update Landmark" : "Save Landmark"}
                    </Text>
                </TouchableOpacity>
                <FlatList
                    data={landmarks}
                    keyExtractor={(item) => item.id}
                    renderItem={renderLandmarkItem}
                    style={{ marginTop: 24 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#fff" },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#49A5A2",
        paddingVertical: 10,
        paddingHorizontal: 15,
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
        color: "#fff",
        textAlign: "center",
    },
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 24,
        justifyContent: "flex-start",
    },
    label: {
        fontSize: 16,
        color: "#333",
        marginBottom: 10,
        fontWeight: "bold",
    },
    input: {
        borderWidth: 1,
        borderColor: "#49A5A2",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 18,
        backgroundColor: "#f7f7f7",
    },
    saveBtn: {
        backgroundColor: "#49A5A2",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 10,
    },
    saveBtnText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    landmarkRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: "#49A5A2",
        borderRadius: 10,
        backgroundColor: "#e3f6f5",
        marginBottom: 10,
        minHeight: 48,
    },
    landmarkName: {
        fontSize: 16,
        color: "#333",
        marginLeft: 9, // Add space between landmark and swipe button
    },
    deleteBtn: {
        backgroundColor: "red",
        width: 60,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
        height: 48,
        marginLeft: 6, // Add space between delete button and landmark
    },
    editBtn: {
        backgroundColor: "#49A5A2",
        width: 60,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
        height: 48,
        marginRight: 6, // Add space between edit button and landmark
    },
});