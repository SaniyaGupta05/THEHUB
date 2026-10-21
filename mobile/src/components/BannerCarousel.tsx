import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground, TouchableOpacity } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

const { width } = Dimensions.get('window');

interface BannerCarouselProps {
  onExplorePress?: () => void;
  onHubklubPress?: () => void;
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({
  onExplorePress,
  onHubklubPress,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const banners = [
    {
      id: 'b1',
      tag: 'NEW FESTIVE COUTURE',
      title: 'ROYAL HERITAGE & WEDDINGS',
      subtitle: 'Artisanal embroideries, raw silks & heirloom bandi sets.',
      cta: 'EXPLORE COLLECTION',
      onPress: onExplorePress,
      bg: '#1C1917',
    },
    {
      id: 'b2',
      tag: 'HUBKLUB LOYALTY REWARDS',
      title: 'EARN UP TO 6% BACK + 20% BONUS',
      subtitle: '1 Point = ₹1. Spend ₹1,000 to unlock prestigious privileges.',
      cta: 'VIEW HUBKLUB BENEFITS',
      onPress: onHubklubPress,
      bg: '#141414',
    },
  ];

  const current = banners[activeIndex];

  return (
    <View style={styles.container}>
      <View style={[styles.banner, { backgroundColor: current.bg }]}>
        <View style={styles.content}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{current.tag}</Text>
          </View>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>

          <TouchableOpacity style={styles.ctaButton} onPress={current.onPress}>
            <Text style={styles.ctaText}>{current.cta}</Text>
          </TouchableOpacity>
        </View>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {banners.map((b, idx) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => setActiveIndex(idx)}
              style={[
                styles.dot,
                idx === activeIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
  },
  banner: {
    borderRadius: 8,
    padding: SPACING.lg,
    minHeight: 180,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#333333',
  },
  content: {
    flex: 1,
  },
  tagBadge: {
    backgroundColor: 'rgba(197, 160, 89, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  tagText: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    lineHeight: 24,
    marginBottom: 6,
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
    maxWidth: '90%',
  },
  ctaButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 2,
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    height: 3,
    borderRadius: 2,
  },
  activeDot: {
    width: 24,
    backgroundColor: COLORS.gold,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#555555',
  },
});
