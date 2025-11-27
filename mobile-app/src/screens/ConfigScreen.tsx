import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import { ConfigService } from '../services/ConfigService';

export default function ConfigScreen() {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [docId, setDocId] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [credentials, setCredentials] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const sId = await ConfigService.getSpreadsheetId();
    const dId = await ConfigService.getDocId();
    const fId = await ConfigService.getDriveFolderId();
    const creds = await ConfigService.getCredentials();
    const tok = await ConfigService.getToken();

    if (sId) setSpreadsheetId(sId);
    if (dId) setDocId(dId);
    if (fId) setDriveFolderId(fId);
    if (creds) setCredentials(creds);
    if (tok) setToken(tok);
  };

  const saveConfig = async () => {
    try {
      await ConfigService.setSpreadsheetId(spreadsheetId);
      await ConfigService.setDocId(docId);
      await ConfigService.setDriveFolderId(driveFolderId);

      if (credentials) {
          // Validate JSON
          try {
              JSON.parse(credentials);
              await ConfigService.setCredentials(credentials);
          } catch (e) {
              Alert.alert('Error', 'Invalid Credentials JSON');
              return;
          }
      }

      if (token) {
          // Validate JSON
          try {
              JSON.parse(token);
              await ConfigService.setToken(token);
          } catch (e) {
              Alert.alert('Error', 'Invalid Token JSON');
              return;
          }
      }

      Alert.alert('Success', 'Configuration saved locally.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration.');
    }
  };

  const clearConfig = async () => {
      await ConfigService.clearAll();
      setSpreadsheetId('');
      setDocId('');
      setDriveFolderId('');
      setCredentials('');
      setToken('');
      Alert.alert('Cleared', 'All configuration cleared.');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Spreadsheet ID</Text>
      <TextInput style={styles.input} value={spreadsheetId} onChangeText={setSpreadsheetId} placeholder="Spreadsheet ID" />

      <Text style={styles.label}>Google Doc ID</Text>
      <TextInput style={styles.input} value={docId} onChangeText={setDocId} placeholder="Google Doc ID" />

      <Text style={styles.label}>Drive Folder ID</Text>
      <TextInput style={styles.input} value={driveFolderId} onChangeText={setDriveFolderId} placeholder="Drive Folder ID" />

      <Text style={styles.label}>Credentials JSON (client_secret content)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={credentials}
        onChangeText={setCredentials}
        placeholder="Paste credentials.json content here"
        multiline
      />

      <Text style={styles.label}>Token JSON (token.json content)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={token}
        onChangeText={setToken}
        placeholder="Paste token.json content here"
        multiline
      />

      <Button title="Save Configuration" onPress={saveConfig} />
      <View style={{ marginTop: 20 }}>
        <Button title="Clear Configuration" onPress={clearConfig} color="red" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  label: { fontWeight: 'bold', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 5, borderRadius: 5 },
  textArea: { height: 100, textAlignVertical: 'top' },
});
