// screens/ChatScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";
import GeminiChatUI from "../components/GeminiChatUI";
import { useNavigation } from "@react-navigation/native";
import { getUserInfo } from "../services/getinfo";

const db = getFirestore();

export default function ChatScreen() {
  const [posts, setPosts] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [userFullName, setUserFullName] = useState("");
  const [geminiVisible, setGeminiVisible] = useState(false);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const user = await AsyncStorage.getItem("user");
      setUserInfo(user);
      if (user) {
        const info = await getUserInfo(user);
        if (info) {
          setUserFullName(`${info.firstName} ${info.lastName}`);
        }
      }
    })();
  }, []);

  const fetchPosts = async () => {
    try {
      const q = query(
        collection(db, "community_posts"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      setPosts(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handlePost = async () => {
    if (!userInfo) {
      setPostModalVisible(false);
      navigation.navigate("LoginScreen");
      return;
    }
    if (!input.trim()) return;
    
    try {
      setLoading(true);
      await addDoc(collection(db, "community_posts"), {
        text: input.trim(),
        userId: userInfo,
        userFullName: userFullName,
        createdAt: serverTimestamp(),
      });
      setInput("");
      setPostModalVisible(false);
      await fetchPosts();
    } catch (error) {
      console.error("Error posting:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
  <SafeAreaView style={styles.container} edges={['top']}>
    {/* Header Bar */}
    <View style={styles.headerBar}>
      <View style={styles.headerContent}>
        <Icon name="people" size={28} color="#fff" style={{ marginRight: 12 }} />
        <Text style={styles.headerTitle}>Community</Text>
      </View>

      {/* Gemini AI Button */}
      <TouchableOpacity
        style={styles.geminiButton}
        onPress={() => setGeminiVisible(true)}
      >
        <Icon name="sparkles" size={22} color="#fff" />
      </TouchableOpacity>
    </View>

    {/* Gemini Chat Modal */}
    <Modal
      visible={geminiVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setGeminiVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.geminiModalContainer}>
          <GeminiChatUI onClose={() => setGeminiVisible(false)} />
        </View>
      </View>
    </Modal>

    {/* Posts List */}
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.postCard}
          onPress={() => navigation.navigate("CommentsScreen", { post: item })}
          activeOpacity={0.7}
        >
          <View style={styles.postHeader}>
            <View style={styles.avatarCircle}>
              <Icon name="person" size={24} color="#fff" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.postUser}>
                {item.userFullName || item.userId || "Anonymous"}
              </Text>
              <Text style={styles.postTimestamp}>
                {item.createdAt?.toDate
                  ? new Date(item.createdAt.toDate()).toLocaleDateString()
                  : "Just now"}
              </Text>
            </View>

            <Icon name="chevron-forward" size={20} color="#e75e33" />
          </View>

          <Text style={styles.postText}>{item.text}</Text>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Icon name="chatbubbles-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No posts yet</Text>
          <Text style={styles.emptySubtext}>
            Be the first to start a discussion!
          </Text>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#e75e33"]}
          tintColor="#e75e33"
        />
      }
    />

    {/* Floating Create Post Button */}
    <TouchableOpacity
      style={styles.createPostButton}
      onPress={() => {
        if (!userInfo) {
          navigation.navigate("LoginScreen");
        } else {
          setPostModalVisible(true);
        }
      }}
    >
      <Icon name="add" size={28} color="#fff" />
    </TouchableOpacity>

    {/* Post Creation Modal */}
    <Modal
      visible={postModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setPostModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.postModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Post</Text>

            <TouchableOpacity
              onPress={() => {
                setInput("");
                setPostModalVisible(false);
              }}
              disabled={loading}
            >
              <Icon name="close-circle" size={28} color="#e75e33" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalUserInfo}>
            <View style={styles.modalAvatarCircle}>
              <Icon name="person" size={20} color="#fff" />
            </View>
            <Text style={styles.modalUserName}>{userFullName || "User"}</Text>
          </View>

          <TextInput
            style={styles.modalInput}
            value={input}
            onChangeText={setInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#999"
            multiline
            editable={!loading}
            autoFocus
          />

          <TouchableOpacity
            style={[
              styles.postSubmitButton,
              (!input.trim() || loading) && styles.postSubmitButtonDisabled,
            ]}
            onPress={handlePost}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon
                  name="send"
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.postSubmitButtonText}>Post</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f8fa",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#e75e33",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 24,
    letterSpacing: 0.5,
  },
  geminiButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#e75e33",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e75e33",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  postUser: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#222",
    marginBottom: 2,
  },
  postTimestamp: {
    fontSize: 12,
    color: "#888",
  },
  postText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#999",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 8,
  },
  createPostButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e75e33",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#e75e33",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  geminiModalContainer: {
    width: "100%",
    height: "90%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    elevation: 10,
  },
  postModalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    elevation: 12,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#e75e33",
  },
  modalUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modalAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e75e33",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  modalInput: {
    minHeight: 120,
    backgroundColor: "#f7f8fa",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#222",
    marginBottom: 20,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#e1e4e8",
  },
  postSubmitButton: {
    flexDirection: "row",
    backgroundColor: "#e75e33",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  postSubmitButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
  },
  postSubmitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});