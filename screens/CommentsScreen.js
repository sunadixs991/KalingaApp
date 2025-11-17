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
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getUserInfo } from "../services/getinfo";

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

  const fetchComments = async () => {
    if (!post) return;
    
    try {
      setFetchingComments(true);
      const postId = post.id;
      
      console.log("Fetching comments for postId:", postId, "Type:", typeof postId);
      
      // REMOVED orderBy to avoid index requirement - comments will be sorted by Firestore document order
      const q = query(
        collection(db, "community_comments"),
        where("postId", "==", postId)
      );
      
      const snapshot = await getDocs(q);
      console.log("Number of comments found:", snapshot.docs.length);
      
      const fetchedComments = snapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("Comment data:", data);
        return { ...data, id: doc.id };
      });
      
      // Sort comments manually by createdAt (oldest first)
      const sortedComments = fetchedComments.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.seconds - b.createdAt.seconds;
      });
      
      setComments(sortedComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setFetchingComments(false);
    }
  };

  useEffect(() => {
    fetchComments();
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchComments();
    });

    return unsubscribe;
  }, [post, navigation]);

  const handleComment = async () => {
    if (!userInfo) {
      navigation.navigate("LoginScreen");
      return;
    }
    if (!commentInput.trim() || !post) return;
    
    try {
      setCommentLoading(true);
      
      await addDoc(collection(db, "community_comments"), {
        postId: post.id,
        text: commentInput.trim(),
        userId: userInfo,
        userFullName: userFullName,
        createdAt: serverTimestamp(),
      });
      
      console.log("Comment added for postId:", post.id);
      
      setCommentInput("");
      
      // Refetch comments after posting
      await fetchComments();
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f8fa" }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post & Comments</Text>
        </View>

        <View style={styles.postCard}>
          <View style={styles.avatarCircle}>
            <Icon name="person" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.postUser}>
              {post?.userFullName
                ? post.userFullName
                : post?.userId
                ? post.userId
                : "Anonymous"}
            </Text>
            <Text style={styles.postText}>{post?.text}</Text>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeader}>
            Comments {comments.length > 0 && `(${comments.length})`}
          </Text>

          {fetchingComments ? (
            <ActivityIndicator
              size="small"
              color="#e75e33"
              style={{ marginTop: 20 }}
            />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.commentCard}>
                  <View style={styles.commentAvatar}>
                    <Icon name="person-circle" size={32} color="#e75e33" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentUser}>
                      {item.userFullName
                        ? item.userFullName
                        : item.userId
                        ? item.userId
                        : "Anonymous"}
                    </Text>
                    <Text style={styles.commentText}>{item.text}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.noCommentsText}>
                  No comments yet. Be the first to comment!
                </Text>
              }
              contentContainerStyle={{ paddingBottom: 80 }}
            />
          )}
        </View>

        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            value={commentInput}
            onChangeText={setCommentInput}
            placeholder={
              userInfo ? "Write a comment..." : "Sign in to comment"
            }
            editable={!!userInfo && !commentLoading}
          />
          <TouchableOpacity
            style={[
              styles.commentPostButton,
              (!userInfo || commentLoading || !commentInput.trim()) && {
                opacity: 0.5,
              },
            ]}
            onPress={handleComment}
            disabled={!userInfo || commentLoading || !commentInput.trim()}
          >
            {commentLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e75e33",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 4,
  },
  backButton: {
    marginRight: 12,
    backgroundColor: "#e75e33",
    borderRadius: 20,
    padding: 4,
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
    letterSpacing: 1,
  },
  postCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#e75e33",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e75e33",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  postUser: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#e75e33",
    marginBottom: 4,
  },
  postText: {
    fontSize: 16,
    color: "#222",
  },
  commentsSection: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
  },
  commentsHeader: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#e75e33",
    marginBottom: 10,
    marginLeft: 2,
  },
  commentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#e75e33",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  commentUser: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#e75e33",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 15,
    color: "#222",
  },
  noCommentsText: {
    color: "#888",
    marginTop: 20,
    textAlign: "center",
    fontSize: 15,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 2,
    shadowColor: "#e75e33",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    marginRight: 8,
    color: "#222",
  },
  commentPostButton: {
    backgroundColor: "#e75e33",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
});