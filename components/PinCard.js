// ../components/PinCard.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { formatVotes, getPinVoteScore } from '../services/PinService';

const PinCard = ({ pin, onPress }) => {
  const voteScore = getPinVoteScore(pin);
  const voteColor = voteScore > 0 ? '#4CAF50' : voteScore < 0 ? '#F44336' : '#666';
  
  // Category colors for visual distinction
const categoryIcons = {
  "Clean Drinking Water": "tint",
  "Medical Aid": "hospital",
  "First Aid Kit": "briefcase-medical",
  "Charging Station": "charging-station",
  "Free Wi-Fi Access": "wifi",
  "Clothing Supply": "tshirt",
  "Blankets Supply": "bed",
  "Animal Shelter": "paw",
  "Temporary Shelter": "home",
  "Rescue Equipment": "life-ring",
  "Sanitation Facility": "shower",
  "Portable Toilets": "toilet",
  "Others": "map-marker-alt",
};

const getCategoryIcon = (category = "") => {
  const key = category.trim();
  return categoryIcons[key] || categoryIcons["Others"];
};

};

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress && onPress(pin)}>
      {/* Header with category and distance */}
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(pin.category) }]}>
          <Text style={styles.categoryText}>{pin.category}</Text>
        </View>
        <View style={styles.distanceContainer}>
          <Icon name="location-outline" size={12} color="#666" />
          <Text style={styles.distanceText}>{pin.formattedDistance}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {pin.description}
      </Text>

      {/* Footer with votes and user info */}
      <View style={styles.cardFooter}>
        <View style={styles.userInfo}>
          <Icon name="person-outline" size={14} color="#666" />
          <Text style={styles.userName}>{pin.userFirstName}</Text>
        </View>
        
        <View style={styles.voteInfo}>
          <Text style={[styles.voteText, { color: voteColor }]}>
            {voteScore > 0 ? '+' : ''}{voteScore}
          </Text>
          <View style={styles.voteDetails}>
            <Text style={styles.voteCount}>👍{pin.upvotes || 0}</Text>
            <Text style={styles.voteCount}>👎{pin.downvotes || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: wp('4%'),
    marginBottom: hp('1.5%'),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1%'),
  },
  categoryBadge: {
    paddingHorizontal: wp('2.5%'),
    paddingVertical: hp('0.5%'),
    borderRadius: 12,
    flex: 1,
    marginRight: wp('2%'),
  },
  categoryText: {
    color: '#fff',
    fontSize: wp('3%'),
    fontWeight: '600',
    textAlign: 'center',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: wp('3%'),
    color: '#666',
    marginLeft: wp('1%'),
    fontWeight: '500',
  },
  description: {
    fontSize: wp('3.5%'),
    color: '#333',
    lineHeight: wp('5%'),
    marginBottom: hp('1%'),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp('0.5%'),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userName: {
    fontSize: wp('3.2%'),
    color: '#666',
    marginLeft: wp('1%'),
    fontWeight: '500',
  },
  voteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteText: {
    fontSize: wp('3.5%'),
    fontWeight: 'bold',
    marginRight: wp('2%'),
  },
  voteDetails: {
    flexDirection: 'row',
  },
  voteCount: {
    fontSize: wp('3%'),
    color: '#888',
    marginLeft: wp('1%'),
  },
});

export default PinCard;