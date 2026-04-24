import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Lock, Eye, Mail, ArrowRight } from 'lucide-react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { trpc } from '../utils/trpc';
import { setStorageItem, getStorageItem } from '../utils/storage';
import { Alert } from 'react-native';
import { formatError } from '../utils/errors';

WebBrowser.maybeCompleteAuthSession();

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: true,
});

const { width, height } = Dimensions.get('window');
const CORAL = '#e87a6e';
const HEADER_HEIGHT = height * 0.25;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const googleLoginMutation = trpc.profile.googleLogin.useMutation({
    onSuccess: async (data: any) => {
      await setStorageItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        await setStorageItem('refreshToken', data.refreshToken);
      }
      setTimeout(() => {
        router.replace('/dashboard');
      }, 100);
    },
    onError: (error: any) => {
      setIsGoogleLoading(false);
      Alert.alert('Google Login Error', formatError(error));
    },
  });

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      const idToken = response.data?.idToken;
      if (idToken) {
        googleLoginMutation.mutate({ idToken });
      } else {
        setIsGoogleLoading(false);
        Alert.alert('Auth Error', 'Could not get identity token from Google.');
      }
    } catch (error: any) {
      setIsGoogleLoading(false);
      console.log('[NativeAuth] Error:', error);
      if (error.code === 'SIGN_IN_CANCELLED') {
        // User cancelled
      } else {
        Alert.alert('Google Auth Error', error.message || 'Authentication failed.');
      }
    }
  };

  React.useEffect(() => {
    const checkSession = async () => {
      const token = await getStorageItem('accessToken');
      if (token) {
        router.replace('/dashboard');
      }
    };
    checkSession();
  }, []);

  const loginMutation = trpc.profile.login.useMutation({
    onSuccess: async (data: any) => {
      await setStorageItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        await setStorageItem('refreshToken', data.refreshToken);
      }
      setTimeout(() => {
        router.replace('/dashboard');
      }, 100);
    },
    onError: (error: any) => {
      Alert.alert('Login Error', formatError(error));
    },
  });

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    loginMutation.mutate({ email, password });
  };

  const handleAppleLogin = () => {
    Alert.alert('Coming Soon', 'Apple Login is coming soon. Please use Email/Password for now.');
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      {/* Main Coral Header Background */}
      <View 
        className="justify-center px-7 bg-coral"
        style={{ height: HEADER_HEIGHT }}
      >
        <View className="-mt-3">
          <Text className="text-white/80 text-[11px] font-semibold uppercase tracking-[2px]">Welcome back</Text>
          <Text className="text-white text-[28px] font-black mt-1">Secretra</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 -mt-8 z-10"
      >
        <ScrollView 
          className="flex-1 bg-white rounded-t-[40px]"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View className="flex-1 px-8 pt-8 pb-8">
            <Text className="text-[26px] font-bold text-[#222] mb-1.5">Sign in</Text>
            <View className="w-[30px] h-[3px] bg-coral rounded-[2px] mb-8" />

            {/* Form Fields Section */}
            <View style={{ flex: 1 }}>
              <Text className="text-[11px] font-bold text-[#333] mb-2 uppercase tracking-widest">Email</Text>
              <View className="flex-row items-center pb-1.5 gap-2">
                <Mail size={16} color="#aaa" />
                <Text className="text-[#ccc] text-sm md:text-base">|</Text>
                <TextInput
                  className="flex-1 text-base text-[#333] h-10"
                  placeholder="demo@email.com"
                  placeholderTextColor="#bbb"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <View className="h-[1px] bg-[#eee] mb-4" />

              <Text className="text-[11px] font-bold text-[#333] mt-3 mb-2 uppercase tracking-widest">Password</Text>
              <View className="flex-row items-center pb-1.5 gap-2">
                <Lock size={16} color="#aaa" />
                <Text className="text-[#ccc] text-sm md:text-base">|</Text>
                <TextInput
                  className="flex-1 text-base text-[#333] h-10"
                  placeholder="enter your password"
                  placeholderTextColor="#bbb"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Eye size={16} color="#bbb" />
                </TouchableOpacity>
              </View>
              <View className="h-[1px] bg-[#eee] mb-4" />

              <View className="flex-row justify-between items-center mt-4 mb-8">
                <TouchableOpacity
                  className="flex-row items-center gap-2"
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View className={`w-[18px] h-[18px] rounded-[4px] border-[1.5px] border-[#eee] items-center justify-center ${rememberMe ? 'bg-coral border-coral' : 'bg-[#f8fafc]'}`}>
                    {rememberMe && <Text className="text-white text-[10px] font-bold">✓</Text>}
                  </View>
                  <Text className="text-sm text-[#64748b]">Remember Me</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text className="text-sm text-coral font-semibold">Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-4">
              <TouchableOpacity 
                className={`bg-coral h-[54px] rounded-[27px] flex-row items-center justify-center mb-8 ${loginMutation.isPending ? 'opacity-70' : ''}`}
                activeOpacity={0.85} 
                onPress={handleLogin}
                disabled={loginMutation.isPending}
                style={{ boxShadow: '0 4px 16px rgba(232, 122, 110, 0.3)' }}
              >
                {loginMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text className="text-white text-lg font-bold">Login</Text>
                    <ArrowRight size={18} color="white" className="ml-2" />
                  </>
                )}
              </TouchableOpacity>

              <View className="flex-row items-center gap-3 mb-8">
                <View className="flex-1 h-[1px] bg-[#f1f5f9]" />
                <Text className="text-[11px] text-[#94a3b8] font-semibold uppercase tracking-widest">or continue with</Text>
                <View className="flex-1 h-[1px] bg-[#f1f5f9]" />
              </View>

              <View className="flex-row justify-center gap-5 mb-8">
                <TouchableOpacity 
                  className="w-[54px] h-[54px] rounded-[27px] border-[1.5px] border-[#f1f5f9] items-center justify-center bg-white shadow-sm" 
                  activeOpacity={0.85} 
                  onPress={handleGoogleLogin}
                  style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}
                >
                  <FontAwesome6 name="google" size={24} color="#DB4437" />
                </TouchableOpacity>

                <TouchableOpacity 
                  className="w-[54px] h-[54px] rounded-[27px] bg-black items-center justify-center overflow-hidden" 
                  activeOpacity={0.85} 
                  onPress={handleAppleLogin}
                >
                  <Ionicons name="logo-apple" size={26} color="white" />
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-center items-center">
                <Text className="text-sm text-[#64748b]">Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/signup')}>
                  <Text className="text-sm text-coral font-bold ml-1">Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}


