import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    StatusBar,
    TouchableOpacity,
    Alert,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";

export default function ManageEvacuationPins() {
    const [pins, setPins] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();

    useEffect(() => {
        fetchEvacPins();
    }, []);

    const fetchEvacPins = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "evacuation_pins"));
            const list = snap.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
            setPins(list);
        } catch (error) {
            Alert.alert("Error", "Failed to fetch evacuation pins.");
        }
        setLoading(false);
    };

    const handleDeletePin = (pinId) => {
        Alert.alert(
            "Delete Pin",
            "Are you sure you want to delete this evacuation pin?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "evacuation_pins", pinId));
                            setPins((prev) => prev.filter((p) => p.id !== pinId));
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete pin.");
                        }
                    },
                },
            ]
        );
    };

    // Right swipe delete for evacuation pin
    const renderRightActions = (onDelete) => (
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <Icon name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
    );

    const renderPinItem = ({ item }) => (
        <Swipeable
            renderRightActions={() =>
                renderRightActions(() => handleDeletePin(item.id))
            }
        >
            <View style={styles.pinCard}>
                {/* Removed the FontAwesome5 icon here */}
                <View style={{ flex: 1 }}>
                    <Text style={styles.pinTitle}>{item.description}</Text>
                    <Text style={styles.pinDetail}>
                        Category: {item.category || "Evacuation"}
                    </Text>
                    <Text style={styles.pinDetail}>
                        Capacity: {item.capacity || "N/A"}
                    </Text>
                    <Text style={styles.pinDetail}>
                        Contact: {item.contactPerson || "N/A"}
                    </Text>
                    <Text style={styles.pinDetail}>
                        Barangay: {item.barangay || "N/A"}
                    </Text>
                </View>
            </View>
        </Swipeable>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="chevron-back" size={26} color="#000" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Manage Evacuation Pins</Text>
                <View style={styles.backButton} />
            </View>

            <View style={styles.container}>
                {loading ? (
                    <ActivityIndicator size="large" color="#1976D2" />
                ) : pins.length === 0 ? (
                    <Text style={{ textAlign: "center", marginTop: 40, color: "#888" }}>
                        No evacuation pins found.
                    </Text>
                ) : (
                    <FlatList
                        data={pins}
                        keyExtractor={(item) => item.id}
                        renderItem={renderPinItem}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
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
        backgroundColor: "#1976D2",
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
        color: "#fff",
        textAlign: "center",
    },
    container: { flex: 1, backgroundColor: "#fff", padding: 16 },
    pinCard: {
        backgroundColor: "#f7f7f7",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    pinTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
    pinDetail: { fontSize: 13, color: "#555", marginTop: 2 },
    deleteBtn: {
        backgroundColor: "#ff4444",
        padding: 10,
        borderRadius: 10,
        marginLeft: 10,
        alignItems: "center",
        justifyContent: "center",
    },
});