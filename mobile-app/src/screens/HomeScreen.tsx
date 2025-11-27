import React, { useState } from 'react';
import { View, Text, Button, Image, ScrollView, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { processImageWithOCR, parseOCRText } from '../services/OcrService';
import { GoogleService } from '../services/GoogleService';

export default function HomeScreen({ navigation }: any) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    date: '',
    from: '',
    to: '',
    modeOfTravel: '',
    purpose: '',
    travelExpenses: '',
    lodgingExpenses: '',
    foodS1: '',
    foodS2: '',
    foodS3: '',
    foodS4: '',
    foodS5: '',
    foodS6: '',
    amount: '',
    billDetails: '',
    remarks: '',
    budgetHead: ''
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setStatus('Image selected. Ready to process.');
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.granted === false) {
      Alert.alert("Permission to access camera is required!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setStatus('Photo taken. Ready to process.');
    }
  };

  const processOCR = async () => {
    if (!imageUri) return;
    setLoading(true);
    setStatus('Processing OCR...');
    try {
      const text = await processImageWithOCR(imageUri);
      const parsed = parseOCRText(text);

      setFormData(prev => ({
        ...prev,
        date: parsed['Date'] || prev.date,
        amount: parsed['Selected Price'] ? parsed['Selected Price'].replace('₹ ', '') : prev.amount,
      }));

      setStatus('OCR Complete. Please verify data.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'OCR Failed');
      setStatus('OCR Failed.');
    } finally {
      setLoading(false);
    }
  };

  const submitData = async () => {
    if (!imageUri) {
        Alert.alert('Error', 'No image selected');
        return;
    }
    setLoading(true);
    setStatus('Uploading to Google Drive...');

    try {
        // 1. Upload Image
        const imageName = `receipt_${Date.now()}.jpg`;
        const imageUrl = await GoogleService.uploadImageToDrive(imageUri, imageName);

        if (!imageUrl) throw new Error('Image upload failed');

        setStatus('Appending to Sheets...');

        // 2. Append to Sheets
        const successSheet = await GoogleService.appendToSheet({
            ...formData,
            imageName // Or URL if you prefer
        });

        if (!successSheet) throw new Error('Sheet append failed');

        setStatus('Inserting into Doc...');

        // 3. Insert to Doc
        const successDoc = await GoogleService.insertImageToDoc(imageUrl);

        if (!successDoc) console.warn('Doc insert failed, but continuing');

        Alert.alert('Success', 'Data submitted successfully!');
        setStatus('Success!');

        // Reset
        setImageUri(null);
        setFormData({
            date: '', from: '', to: '', modeOfTravel: '', purpose: '',
            travelExpenses: '', lodgingExpenses: '',
            foodS1: '', foodS2: '', foodS3: '', foodS4: '', foodS5: '', foodS6: '',
            amount: '', billDetails: '', remarks: '', budgetHead: ''
        });

    } catch (error: any) {
        Alert.alert('Error', error.message || 'Submission failed');
        setStatus('Submission Failed.');
    } finally {
        setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.buttonRow}>
        <Button title="Pick Image" onPress={pickImage} />
        <Button title="Take Photo" onPress={takePhoto} />
      </View>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.image} />
      )}

      {imageUri && (
          <View style={{ marginVertical: 10 }}>
            <Button title="Process OCR" onPress={processOCR} disabled={loading} />
          </View>
      )}

      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      <Text style={styles.status}>{status}</Text>

      <Text style={styles.header}>Details</Text>

      <TextInput style={styles.input} placeholder="Date" value={formData.date} onChangeText={(t: string) => updateField('date', t)} />
      <TextInput style={styles.input} placeholder="From" value={formData.from} onChangeText={(t: string) => updateField('from', t)} />
      <TextInput style={styles.input} placeholder="To" value={formData.to} onChangeText={(t: string) => updateField('to', t)} />
      <TextInput style={styles.input} placeholder="Mode of Travel" value={formData.modeOfTravel} onChangeText={(t: string) => updateField('modeOfTravel', t)} />
      <TextInput style={styles.input} placeholder="Purpose" value={formData.purpose} onChangeText={(t: string) => updateField('purpose', t)} />
      <TextInput style={styles.input} placeholder="Travel Expenses" keyboardType="numeric" value={formData.travelExpenses} onChangeText={(t: string) => updateField('travelExpenses', t)} />
      <TextInput style={styles.input} placeholder="Lodging Expenses" keyboardType="numeric" value={formData.lodgingExpenses} onChangeText={(t: string) => updateField('lodgingExpenses', t)} />

      <Text style={styles.subHeader}>Food</Text>
      <View style={styles.row}>
          <TextInput style={[styles.input, styles.half]} placeholder="S1" value={formData.foodS1} onChangeText={(t: string) => updateField('foodS1', t)} />
          <TextInput style={[styles.input, styles.half]} placeholder="S2" value={formData.foodS2} onChangeText={(t: string) => updateField('foodS2', t)} />
      </View>
      {/* Add more food fields if needed */}

      <TextInput style={styles.input} placeholder="Total Amount" keyboardType="numeric" value={formData.amount} onChangeText={(t: string) => updateField('amount', t)} />
      <TextInput style={styles.input} placeholder="Remarks" value={formData.remarks} onChangeText={(t: string) => updateField('remarks', t)} />
      <TextInput style={styles.input} placeholder="Budget Head" value={formData.budgetHead} onChangeText={(t: string) => updateField('budgetHead', t)} />      <View style={{ marginTop: 20, marginBottom: 40 }}>
        <Button title="Submit" onPress={submitData} disabled={loading} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  image: { width: '100%', height: 300, resizeMode: 'contain', marginBottom: 10 },
  status: { textAlign: 'center', marginVertical: 5, fontStyle: 'italic' },
  header: { fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  subHeader: { fontSize: 16, marginTop: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 5, borderRadius: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' }
});
