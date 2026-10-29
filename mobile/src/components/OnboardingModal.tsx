import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
  onSignInPress?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  onClose,
  onSignInPress,
}) => {
  const [step, setStep] = useState<'splash' | 'onboarding'>('onboarding');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {/* SCREEN 1: SPLASH SCREEN */}
      {step === 'splash' ? (
        <View style={styles.splashContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80' }}
            style={styles.splashBgImage}
            resizeMode="cover"
          />
          <View style={styles.splashOverlay}>
            <View style={styles.splashCenter}>
              <View style={styles.splashLogoCard}>
                <Image
                  source={require('../../assets/the_hub_logo.png')}
                  style={styles.splashLogoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.splashTagline}>Style • Fashion • Lifestyle</Text>
            </View>

            <TouchableOpacity
              style={styles.splashNextBtn}
              onPress={() => setStep('onboarding')}
              activeOpacity={0.85}
            >
              <Text style={styles.splashNextText}>Enter Boutique</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* SCREEN 2: ONBOARDING SCREEN */
        <SafeAreaView style={styles.onboardingSafeArea}>
          <View style={styles.onboardingHeader}>
            <TouchableOpacity onPress={() => setStep('splash')} style={styles.topBtn}>
              <Ionicons name="sparkles-outline" size={20} color="#111111" />
            </TouchableOpacity>
            <Image
              source={require('../../assets/the_hub_logo.png')}
              style={styles.onboardingBrandLogo}
              resizeMode="contain"
            />
            <TouchableOpacity onPress={onClose} style={styles.topBtn}>
              <Ionicons name="close" size={22} color="#111111" />
            </TouchableOpacity>
          </View>

          <View style={styles.onboardingBody}>
            <Text style={styles.onboardingHeadline}>More Style. More Rewards.</Text>
            <Text style={styles.onboardingSubheadline}>
              Shop your favourite brands and become a HUBKLUB member to earn exclusive points and perks.
            </Text>

            <View style={styles.bagsIllustrationContainer}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80' }}
                style={styles.bagsImage}
                resizeMode="cover"
              />
            </View>

            {/* Pagination Dots */}
            <View style={styles.dotsRow}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>

            {/* Action Buttons matching prototype Screen 2 */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.continueBrowsingBtn}
                onPress={onClose}
                activeOpacity={0.88}
              >
                <Text style={styles.continueBrowsingText}>Continue Browsing</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signInRegisterBtn}
                onPress={() => {
                  onClose();
                  if (onSignInPress) {
                    setTimeout(() => {
                      onSignInPress();
                    }, 350);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.signInRegisterText}>Sign In / Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0A0A0A',
  },
  splashBgImage: {
    width: '100%',
    height: '100%',
  },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 50,
  },
  splashCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogoCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  splashLogoImage: {
    width: 170,
    height: 52,
  },
  splashLogo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 6,
    marginBottom: 8,
  },
  splashTagline: {
    fontSize: 13,
    color: '#D4AF37',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  splashNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    height: 48,
    borderRadius: 24,
  },
  splashNextText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Onboarding Screen 2 Styles
  onboardingSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  onboardingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 50,
  },
  onboardingBrandLogo: {
    width: 96,
    height: 30,
  },
  topBtn: {
    padding: 6,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 4,
  },
  onboardingBody: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  onboardingHeadline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  onboardingSubheadline: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bagsIllustrationContainer: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F8F8',
  },
  bagsImage: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D1D6',
  },
  dotActive: {
    backgroundColor: '#111111',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  continueBrowsingBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#111111',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBrowsingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  signInRegisterBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInRegisterText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
  },
});
