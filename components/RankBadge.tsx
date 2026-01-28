import React from 'react';
import { View, StyleSheet, Image, ImageSourcePropType } from 'react-native';

// Import rank images
const RANK_IMAGES: { [key: string]: ImageSourcePropType } = {
  debutant: require('../assets/images/ranks/rank_1_debutant.png'),
  jogger: require('../assets/images/ranks/rank_2_jogger.png'),
  coureur: require('../assets/images/ranks/rank_3_coureur.png'),
  athlete: require('../assets/images/ranks/rank_4_athlete.png'),
  champion: require('../assets/images/ranks/rank_5_champion.png'),
  maitre: require('../assets/images/ranks/rank_6_maitre.png'),
};

interface RankBadgeProps {
  rankId: string;
  size?: number;
  showBorder?: boolean;
  borderColor?: string;
}

export default function RankBadge({ rankId, size = 32, showBorder = false, borderColor }: RankBadgeProps) {
  const imageSource = RANK_IMAGES[rankId] || RANK_IMAGES.debutant;

  return (
    <View style={[
      styles.container, 
      { 
        width: size, 
        height: size,
        borderRadius: size / 2,
        borderWidth: showBorder ? 2 : 0,
        borderColor: borderColor || 'transparent',
      }
    ]}>
      <Image
        source={imageSource}
        style={[
          styles.image,
          {
            width: size - (showBorder ? 4 : 0),
            height: size - (showBorder ? 4 : 0),
            borderRadius: (size - (showBorder ? 4 : 0)) / 2,
          }
        ]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    // Image styling handled inline
  },
});
