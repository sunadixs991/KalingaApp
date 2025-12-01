// File: screens/CommentsScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
  where,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getUserInfo } from "../services/getinfo";

// Avatar images
const boyImg = require("../assets/boy.png");
const womanImg = require("../assets/woman.png");
const adminImg = require("../assets/admin.png");

const db = getFirestore();

export default function CommentsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const post = route.params?.post;

  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [fetchingComments, setFetchingComments] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [userFullName, setUserFullName] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [isConnected, setIsConnected] = useState(true);

  // Helper cache key per post
  const commentsCacheKey = post && post.id ? `comments_cache_${post.id}` : null;

  useEffect(() => {
    (async () => {
      const user = await AsyncStorage.getItem("user");
      setUserInfo(user);
      if (user) {
        const info = await getUserInfo(user);
        if (info) {
          setUserFullName(`${info.firstName} ${info.lastName}`);
          setUserProfile(info);
        }
      }
    })();
  }, []);

  // Save comments to cache
  const saveCommentsToCache = async (key, data) => {
    if (!key) return;
    try {
      await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch (e) {
      console.warn("Failed to save comments cache:", e);
    }
  };

  // Load comments from cache
  const loadCommentsFromCache = async (key) => {
    if (!key) return null;
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.data || null;
      }
    } catch (e) {
      console.warn("Failed to load comments cache:", e);
    }
    return null;
  };

  const fetchComments = async () => {
    if (!post) return;

    try {
      setFetchingComments(true);
      const netState = await NetInfo.fetch();

      if (netState.isConnected) {
        // online: fetch from Firestore and update cache
        const q = query(
          collection(db, "community_comments"),
          where("postId", "==", post.id)
        );
        const snapshot = await getDocs(q);

        const fetchedComments = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));

        const sorted = fetchedComments.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return a.createdAt.seconds - b.createdAt.seconds;
        });

        setComments(sorted);
        await saveCommentsToCache(commentsCacheKey, sorted);
      } else {
        // offline: load cache
        const cached = await loadCommentsFromCache(commentsCacheKey);
        if (cached) {
          setComments(cached);
        } else {
          setComments([]);
        }
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      // fallback to cache on error
      const cached = await loadCommentsFromCache(commentsCacheKey);
      if (cached) setComments(cached || []);
    } finally {
      setFetchingComments(false);
    }
  };

  useEffect(() => {
    fetchComments();

    const unsubscribeFocus = navigation.addListener("focus", () => {
      fetchComments();
    });

    // Network listener: when back online, refresh
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      setIsConnected(!!state.isConnected);
      if (state.isConnected) {
        fetchComments();
      }
    });

    return () => {
      unsubscribeFocus && unsubscribeFocus();
      unsubscribeNet && unsubscribeNet();
    };
  }, [post, navigation]);

  const handleComment = async () => {
    if (!userInfo) {
      navigation.navigate("LoginScreen");
      return;
    }
    if (!commentInput.trim() || !post) return;

    try {
      setCommentLoading(true);

      // include commenter gender so UI can show avatar
      const gender = (userProfile && userProfile.gender) || "unknown";
      await addDoc(collection(db, "community_comments"), {
        postId: post.id,
        text: commentInput.trim(),
        userId: userInfo,
        userFullName: userFullName,
        gender: gender, // "Male" | "Female" | "admin" | "unknown"
        createdAt: serverTimestamp(),
      });

      setCommentInput("");

      await fetchComments();
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="chevron-back" size={26} color="#ffffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post & Comments</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Original Post */}
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.avatar}>
              {post?.gender ? (
                post.gender.toString().toLowerCase() === "male" ? (
                  <Image source={boyImg} style={styles.avatarImage} />
                ) : post.gender.toString().toLowerCase() === "female" ? (
                  <Image source={womanImg} style={styles.avatarImage} />
                ) : post.gender.toString().toLowerCase() === "admin" ? (
                  <Image source={adminImg} style={styles.avatarImage} />
                ) : (
                  <Icon name="person" size={20} color="#fff" />
                )
              ) : (
                <Icon name="person" size={20} color="#fff" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.postUser}>
                {post?.userFullName || post?.userId || "Anonymous"}
              </Text>
              <Text style={styles.postTimestamp}>
                {post?.createdAt?.toDate
                  ? new Date(post.createdAt.toDate()).toLocaleDateString()
                  : "Just now"}
              </Text>
            </View>
          </View>
          <Text style={styles.postText}>{post?.text}</Text>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsSectionHeader}>
            <Text style={styles.commentsTitle}>Comments</Text>
            {comments.length > 0 && (
              <View style={styles.commentsBadge}>
                <Text style={styles.commentsBadgeText}>{comments.length}</Text>
              </View>
            )}
          </View>

          {fetchingComments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#EC6135" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.commentCard}>
                  <View style={styles.commentAvatar}>
                    {item?.gender ? (
                      item.gender.toString().toLowerCase() === "male" ? (
                        <Image source={boyImg} style={styles.commentAvatarImage} />
                      ) : item.gender.toString().toLowerCase() === "female" ? (
                        <Image source={womanImg} style={styles.commentAvatarImage} />
                      ) : item.gender.toString().toLowerCase() === "admin" ? (
                        <Image source={adminImg} style={styles.commentAvatarImage} />
                      ) : (
                        <Icon name="person" size={16} color="#fff" />
                      )
                    ) : (
                      <Icon name="person" size={16} color="#fff" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentUser}>
                      {item.userFullName || item.userId || "Anonymous"}
                    </Text>
                    <Text style={styles.commentText}>{item.text}</Text>
                    <Text style={styles.commentTimestamp}>
                      {item.createdAt?.toDate
                        ? new Date(item.createdAt.toDate()).toLocaleDateString()
                        : "Just now"}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="chatbubble-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No comments yet</Text>
                  <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 100 }}
            />
          )}
        </View>

        {/* Comment Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={commentInput}
            onChangeText={setCommentInput}
            placeholder={userInfo ? "Write a comment..." : "Sign in to comment"}
            placeholderTextColor="#999"
            editable={!!userInfo && !commentLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!userInfo || commentLoading || !commentInput.trim()) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleComment}
            disabled={!userInfo || commentLoading || !commentInput.trim()}
          >
            {commentLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#e75e33",
  },
  backButton: {
    width: 40,
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffffff",
  },
  postCard: {
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
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
  commentsSection: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
  },
  commentsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  commentsBadge: {
    backgroundColor: "#EC6135",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 24,
    alignItems: "center",
  },
  commentsBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  commentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  commentAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTimestamp: {
    fontSize: 11,
    color: "#999",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EC6135",
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
  },
});