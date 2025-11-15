import React, { useState } from "react";
import { TouchableOpacity, Modal, View, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import GeminiChatUI from "./GeminiChatUI";

export default function FloatingChatButton({ route }) {
  const [chatVisible, setChatVisible] = useState(false);

  return (
    <>
      {/* Floating Button at Top Right */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setChatVisible(true)}
      >
        <Icon name="sparkles" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={chatVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChatVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.25)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: "95%",
              height: "90%",
              backgroundColor: "#fff",
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <GeminiChatUI route={route} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#e75e33",
    borderRadius: 20,
    padding: 10,
    elevation: 8,
    zIndex: 100,
  },
});