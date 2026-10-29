import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { DEMO_CUSTOMERS } from '../constants/config';

export const AuthModal: React.FC = () => {
  const {
    authModalVisible,
    authModalTab,
    closeAuthModal,
    openAuthModal,
    login,
    loginByIdentifier,
    register,
    activeCustomerId,
    isLoggedIn,
  } = useAuth();

  // Registration Form State
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // Sign In State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAccount = async () => {
    setAuthError(null);
    if (!regFirstName.trim() || !regLastName.trim()) {
      const msg = 'Please enter both your first name and last name.';
      setAuthError(msg);
      Alert.alert('Required Fields', msg);
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      const msg = 'Please enter a valid email address.';
      setAuthError(msg);
      Alert.alert('Invalid Email', msg);
      return;
    }
    if (!regPhone.trim()) {
      const msg = 'Please enter your mobile phone number.';
      setAuthError(msg);
      Alert.alert('Required Field', msg);
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        first_name: regFirstName.trim(),
        last_name: regLastName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
      });
      closeAuthModal();
      setRegFirstName('');
      setRegLastName('');
      setRegEmail('');
      setRegPhone('');
      Alert.alert(
        'Welcome to HUBKLUB! 🎉',
        `Your account has been created and you've been awarded 100 bonus HUBKLUB welcome points! Enjoy your luxury shopping experience.`
      );
    } catch (err: any) {
      const msg = err.message || 'Unable to complete registration. Please try again.';
      setAuthError(msg);
      Alert.alert('Registration Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIdentifierLogin = async () => {
    setAuthError(null);
    const trimmed = loginIdentifier.trim();
    if (!trimmed) {
      const msg = 'Please enter your email, mobile number, or customer ID.';
      setAuthError(msg);
      Alert.alert('Required Field', msg);
      return;
    }

    setIsSubmitting(true);
    try {
      await loginByIdentifier(trimmed);
      closeAuthModal();
      setLoginIdentifier('');
      Alert.alert('Welcome Back!', 'You have successfully signed in.');
    } catch (err: any) {
      const msg = err.message || 'No account found with this identifier. Please verify or create an account.';
      setAuthError(msg);
      Alert.alert('Sign In', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPersona = async (personaId: string) => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      await login(personaId);
      closeAuthModal();
    } catch (err: any) {
      console.warn('Persona selection error:', err);
      closeAuthModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authModalVisible) return null;

  return (
    <Modal
      visible={authModalVisible}
      transparent
      animationType="slide"
      onRequestClose={closeAuthModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.authModalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderBranding}>
              <Image
                source={require('../../assets/the_hub_logo.png')}
                style={styles.modalBrandLogo}
                resizeMode="contain"
              />
              <Text style={styles.modalTitle}>
                {authModalTab === 'create' ? 'Create New Account' : 'Sign In to THE HUB'}
              </Text>
            </View>
            <TouchableOpacity onPress={closeAuthModal} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#111111" />
            </TouchableOpacity>
          </View>

          {/* Segmented Tab Controls: [Create Account] | [Sign In] */}
          <View style={styles.tabToggleRow}>
            <TouchableOpacity
              style={[styles.tabToggleBtn, authModalTab === 'signin' && styles.tabToggleBtnActive]}
              onPress={() => {
                setAuthError(null);
                openAuthModal('signin');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabToggleText, authModalTab === 'signin' && styles.tabToggleTextActive]}>
                Sign In / Personas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabToggleBtn, authModalTab === 'create' && styles.tabToggleBtnActive]}
              onPress={() => {
                setAuthError(null);
                openAuthModal('create');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabToggleText, authModalTab === 'create' && styles.tabToggleTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* TAB 1: SIGN IN / PERSONAS */}
            {authModalTab === 'signin' ? (
              <View style={styles.formContainer}>
                <Text style={styles.formSubtitle}>
                  Enter your email, mobile number, or choose a quick test persona:
                </Text>

                {authError && (
                  <View style={styles.authErrorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#D32F2F" />
                    <Text style={styles.authErrorText}>{authError}</Text>
                  </View>
                )}

                {/* Direct Identifier Login Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email or Mobile Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 98250 12345 or aarav.patel@example.com"
                    placeholderTextColor="#A0A0A0"
                    value={loginIdentifier}
                    onChangeText={(val) => {
                      setLoginIdentifier(val);
                      if (authError) setAuthError(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handleIdentifierLogin}
                  />
                </View>

                {/* High visibility Sign In Action Button */}
                <TouchableOpacity
                  style={[styles.primaryActionBtn, isSubmitting && { opacity: 0.7 }]}
                  onPress={handleIdentifierLogin}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Signing In...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryActionBtnText}>Sign In to THE HUB</Text>
                  )}
                </TouchableOpacity>

                {/* Quick Persona Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR QUICK DEMO PERSONAS</Text>
                  <View style={styles.dividerLine} />
                </View>

                {DEMO_CUSTOMERS.map((persona) => {
                  const isSelected = isLoggedIn && persona.id === activeCustomerId;
                  return (
                    <TouchableOpacity
                      key={persona.id}
                      style={[
                        styles.personaOptionCard,
                        isSelected && styles.personaOptionSelected,
                      ]}
                      onPress={() => handleSelectPersona(persona.id)}
                      activeOpacity={0.8}
                      disabled={isSubmitting}
                    >
                      <View style={styles.personaRadio}>
                        {isSelected && <View style={styles.personaRadioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.personaOptionName, isSelected && { color: '#C5A880' }]}>
                          {persona.name}
                        </Text>
                        <Text style={styles.personaOptionDesc}>{persona.description}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              /* TAB 2: CREATE ACCOUNT FORM */
              <View style={styles.formContainer}>
                <Text style={styles.formSubtitle}>
                  Join THE HUB & activate your exclusive HUBKLUB loyalty membership.
                </Text>

                {authError && (
                  <View style={styles.authErrorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#D32F2F" />
                    <Text style={styles.authErrorText}>{authError}</Text>
                  </View>
                )}

                {/* First Name & Last Name */}
                <View style={styles.inputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>First Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Priya"
                      placeholderTextColor="#A0A0A0"
                      value={regFirstName}
                      onChangeText={(v) => {
                        setRegFirstName(v);
                        if (authError) setAuthError(null);
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Last Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Sharma"
                      placeholderTextColor="#A0A0A0"
                      value={regLastName}
                      onChangeText={(v) => {
                        setRegLastName(v);
                        if (authError) setAuthError(null);
                      }}
                    />
                  </View>
                </View>

                {/* Email Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. priya.sharma@example.com"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={regEmail}
                    onChangeText={(v) => {
                      setRegEmail(v);
                      if (authError) setAuthError(null);
                    }}
                  />
                </View>

                {/* Mobile Phone Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. +91 98765 43210"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="phone-pad"
                    value={regPhone}
                    onChangeText={(v) => {
                      setRegPhone(v);
                      if (authError) setAuthError(null);
                    }}
                  />
                </View>

                {/* Membership Benefits Box */}
                <View style={styles.benefitsBox}>
                  <View style={styles.benefitRow}>
                    <Ionicons name="sparkles" size={16} color="#C5A880" />
                    <Text style={styles.benefitText}>Earn 3% - 6% points on luxury apparel</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <Ionicons name="gift-outline" size={16} color="#C5A880" />
                    <Text style={styles.benefitText}>1 HUBKLUB Point = ₹1 Instant Checkout Redemption</Text>
                  </View>
                  <View style={styles.benefitRow}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#C5A880" />
                    <Text style={styles.benefitText}>Access to member seasonal private sales</Text>
                  </View>
                </View>

                {/* Create Account CTA */}
                <TouchableOpacity
                  style={[styles.primaryActionBtn, isSubmitting && { opacity: 0.6 }]}
                  onPress={handleCreateAccount}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Creating Account...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryActionBtnText}>Create Account & Join THE HUB</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  authModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalHeaderBranding: {
    flex: 1,
    gap: 4,
  },
  modalBrandLogo: {
    width: 104,
    height: 32,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 0.2,
  },
  closeBtn: {
    padding: 4,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabToggleTextActive: {
    color: '#111111',
  },
  formContainer: {
    gap: 14,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 4,
  },
  authErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  authErrorText: {
    fontSize: 12,
    color: '#D32F2F',
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textInput: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111111',
  },
  primaryActionBtn: {
    backgroundColor: '#111111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  personaOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    backgroundColor: '#FAFAFA',
    gap: 12,
    marginBottom: 8,
  },
  personaOptionSelected: {
    borderColor: '#C5A880',
    backgroundColor: '#FDFBF7',
  },
  personaRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#C5A880',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personaRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C5A880',
  },
  personaOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  personaOptionDesc: {
    fontSize: 11,
    color: '#777777',
    marginTop: 2,
    lineHeight: 14,
  },
  benefitsBox: {
    backgroundColor: '#FDFBF7',
    borderWidth: 1,
    borderColor: '#F0E6D8',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginVertical: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 12,
    color: '#555555',
    flex: 1,
  },
});
