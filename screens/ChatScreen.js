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
  StatusBar,
  Image,
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
  where,
  Timestamp,
  deleteDoc,
  doc,
  limit,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/Ionicons";
import GeminiChatUI from "../components/GeminiChatUI";
import { useNavigation } from "@react-navigation/native";
import { getUserInfo } from "../services/getinfo";

// Avatar images (ensure these files exist in /assets)
const boyImg = require("../assets/boy.png");
const womanImg = require("../assets/woman.png");
const adminImg = require("../assets/admin.png");

const db = getFirestore();

// Deletes posts older than `olderThanHours` that have no comments.
// Returns the number of deleted posts.
export async function deleteInactivePosts(olderThanHours = 24) {
  try {
    const thresholdDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const thresholdTs = Timestamp.fromDate(thresholdDate);

    // Fetch posts that were created at or before the threshold (only those can be deleted)
    const postsQuery = query(
      collection(db, "community_posts"),
      where("createdAt", "<=", thresholdTs)
    );
    const postsSnap = await getDocs(postsQuery);
    let deletedCount = 0;

    for (const postDoc of postsSnap.docs) {
      const postId = postDoc.id;

      // Get the latest comment for this post (if any)
      const latestCommentQuery = query(
        collection(db, "community_comments"),
        where("postId", "==", postId),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const latestCommentSnap = await getDocs(latestCommentQuery);

      // If no comments => delete
      if (latestCommentSnap.empty) {
        await deleteDoc(doc(db, "community_posts", postId));
        deletedCount++;
        continue;
      }

      // If latest comment exists, check its timestamp
      const latestComment = latestCommentSnap.docs[0].data();
      const latestCommentTs = latestComment.createdAt;
      // If latest comment timestamp is absent, treat as deletable
      if (!latestCommentTs || latestCommentTs <= thresholdTs) {
        await deleteDoc(doc(db, "community_posts", postId));
        deletedCount++;
      }
      // else: there is a recent comment (within 24h) -> keep the post
    }

    return deletedCount;
  } catch (err) {
    console.error("deleteInactivePosts failed:", err);
    throw err;
  }
}

export default function ChatScreen() {
  const [posts, setPosts] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
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
          setUserProfile(info); // keep full profile (includes gender)
        }
      }
    })();
  }, []);

  const CACHE_KEY = "community_posts_cache";

  // Save posts to AsyncStorage cache
  const savePostsToCache = async (postsData) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(postsData));
    } catch (e) {
      console.warn("Failed to save posts cache:", e);
    }
  };

  // Load cached posts
  const loadPostsFromCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setPosts(parsed);
      }
    } catch (e) {
      console.warn("Failed to load posts cache:", e);
    }
  };

  const fetchPosts = async () => {
    try {
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        const q = query(
          collection(db, "community_posts"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const postsData = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        setPosts(postsData);
        await savePostsToCache(postsData);
      } else {
        // offline -> load cache
        await loadPostsFromCache();
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      // fallback to cache on any error
      await loadPostsFromCache();
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Subscribe to network changes: when back online, refresh posts from server
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(!!state.isConnected);
      if (state.isConnected) {
        fetchPosts();
      }
    });
    return () => unsubscribe();
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
      // include gender so UI can choose avatar image
      const gender = (userProfile && userProfile.gender) || "unknown";
      await addDoc(collection(db, "community_posts"), {
        text: input.trim(),
        userId: userInfo,
        userFullName: userFullName,
        gender: gender, // "Male" | "Female" | "admin" | "unknown"
        createdAt: serverTimestamp(),
      });
      // refresh and update cache
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="chatbubbles" size={24} color="#ffffffff" />
          <Text style={styles.headerTitle}>Community</Text>
        </View>
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => setGeminiVisible(true)}
        >
          <Icon name="sparkles" size={20} color="#EC6135" />
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
              <View style={styles.avatar}>
                {item.gender ? (
                  item.gender.toString().toLowerCase() === "male" ? (
                    <Image source={boyImg} style={styles.avatarImage} />
                  ) : item.gender.toString().toLowerCase() === "female" ? (
                    <Image source={womanImg} style={styles.avatarImage} />
                  ) : item.gender.toString().toLowerCase() === "admin" ? (
                    <Image source={adminImg} style={styles.avatarImage} />
                  ) : (
                    <Icon name="person" size={20} color="#fff" />
                  )
                ) : (
                  <Icon name="person" size={20} color="#fff" />
                )}
              </View>

              <View style={styles.postMeta}>
                <Text style={styles.postUser}>
                  {item.userFullName || item.userId || "Anonymous"}
                </Text>
                <Text style={styles.postTimestamp}>
                  {item.createdAt?.toDate
                    ? new Date(item.createdAt.toDate()).toLocaleDateString()
                    : "Just now"}
                </Text>
              </View>

              <Icon name="chevron-forward" size={20} color="#666" />
            </View>

            <Text style={styles.postText}>{item.text}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chatbubbles-outline" size={64} color="#ccc" />
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
            colors={["#EC6135"]}
            tintColor="#EC6135"
          />
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
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
                <Icon name="close" size={26} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalUserInfo}>
              <View style={styles.modalAvatar}>
                <Icon name="person" size={18} color="#fff" />
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

            {/* Policy note shown below the input */}
            <View style={{ paddingTop: 8, paddingBottom: 6 }}>
              <Text style={styles.noteText}>
                Note: Posts with no comments after 24 hours may be removed to keep the community focused and relevant.
              </Text>
              
            </View>

            <TouchableOpacity
              style={[
                styles.postButton,
                (!input.trim() || loading) && styles.postButtonDisabled,
              ]}
              onPress={handlePost}
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.postButtonText}>Post</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e75e33",
    backgroundColor: "#e75e33",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffffff",
    marginLeft: 8,
  },
  aiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EC6135",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EC6135",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    resizeMode: "cover",
  },
  postMeta: {
    flex: 1,
  },
  postUser: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  postTimestamp: {
    fontSize: 12,
    color: "#666",
  },
  postText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EC6135",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modalAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EC6135",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  modalUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  modalInput: {
    minHeight: 120,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    marginBottom: 20,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#eee",
  },
  postButton: {
    flexDirection: "row",
    backgroundColor: "#EC6135",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  postButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
  },
  postButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  noteText: {
    fontSize: 12,
    color: "#444",
    fontStyle: "italic",
  },
});