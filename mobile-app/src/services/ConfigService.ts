import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  SPREADSHEET_ID: 'spreadsheet_id',
  DOC_ID: 'doc_id',
  DRIVE_FOLDER_ID: 'drive_folder_id',
  CREDENTIALS: 'google_credentials', // Secure
  TOKEN: 'google_token', // Secure
};

export const ConfigService = {
  // --- Public Configs ---
  getSpreadsheetId: async () => AsyncStorage.getItem(KEYS.SPREADSHEET_ID),
  setSpreadsheetId: async (id: string) => AsyncStorage.setItem(KEYS.SPREADSHEET_ID, id),

  getDocId: async () => AsyncStorage.getItem(KEYS.DOC_ID),
  setDocId: async (id: string) => AsyncStorage.setItem(KEYS.DOC_ID, id),

  getDriveFolderId: async () => AsyncStorage.getItem(KEYS.DRIVE_FOLDER_ID),
  setDriveFolderId: async (id: string) => AsyncStorage.setItem(KEYS.DRIVE_FOLDER_ID, id),

  // --- Secure Configs ---
  getCredentials: async () => SecureStore.getItemAsync(KEYS.CREDENTIALS),
  setCredentials: async (creds: string) => SecureStore.setItemAsync(KEYS.CREDENTIALS, creds),

  getToken: async () => SecureStore.getItemAsync(KEYS.TOKEN),
  setToken: async (token: string) => SecureStore.setItemAsync(KEYS.TOKEN, token),

  // --- Clear All ---
  clearAll: async () => {
    await AsyncStorage.multiRemove([KEYS.SPREADSHEET_ID, KEYS.DOC_ID, KEYS.DRIVE_FOLDER_ID]);
    await SecureStore.deleteItemAsync(KEYS.CREDENTIALS);
    await SecureStore.deleteItemAsync(KEYS.TOKEN);
  },
};
