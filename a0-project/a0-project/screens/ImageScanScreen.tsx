import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { toast } from 'sonner-native';
import { processImageWithOCR, parseOCRText, saveToExcel } from '../services/OcrService';

export default function ImageScanScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userName, phoneNumber } = route.params || {};
  
  const [image, setImage] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
          Alert.alert(
            'Permissions Required',
            'Camera and media library permissions are needed for this app to work properly.',
            [{ text: 'OK' }]
          );
        }
      }
    })();
  }, []);
  
  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      
      if (!result.canceled) {
        setImage(result.assets[0].uri);
        processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.error('Failed to take photo');
    }
  };
  
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      
      if (!result.canceled) {
        setImage(result.assets[0].uri);
        processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      toast.error('Failed to select image');
    }
  };
  
  const processImage = async (imageUri) => {
    setIsProcessing(true);
    
    try {
      // Use our OCR service to process the image
      const ocrResult = await processImageWithOCR(imageUri);
      setExtractedText(ocrResult);
    } catch (error) {
      console.error('OCR processing error:', error);
      toast.error('Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!extractedText.trim()) {
      toast.error('No text to submit');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Parse the OCR text into structured data
      const parsedData = parseOCRText(extractedText);
      
      // Save the data to Excel
      const success = await saveToExcel(parsedData, userName, phoneNumber);
      
      if (success) {
        toast.success('Data successfully saved to Excel');
        
        // Show success message and details
        Alert.alert(
          'Success',
          'Your expense data has been added to the central Excel file.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                // @ts-ignore - TypeScript doesn't know about our routes yet
                navigation.navigate('Home');
              }
            }
          ]
        );
      } else {
        throw new Error('Failed to save data');
      }
    } catch (error) {
      console.error('Error submitting data:', error);
      toast.error('Failed to save data');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerText}>OCR Expense Scanner</Text>
          <Text style={styles.userInfo}>User: {userName}</Text>
        </View>
        
        <View style={styles.imageSection}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.cameraButton]} 
              onPress={takePhoto}
              disabled={isProcessing || isLoading}
            >
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.galleryButton]} 
              onPress={pickImage}
              disabled={isProcessing || isLoading}
            >
              <Text style={styles.buttonText}>Select Image</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.textSection}>
          <Text style={styles.sectionTitle}>Extracted Text</Text>
          
          {isProcessing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007bff" />
              <Text style={styles.loadingText}>Processing image...</Text>
            </View>
          ) : (
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                multiline
                value={extractedText}
                onChangeText={setExtractedText}
                placeholder="Extracted text will appear here"
                editable={!isLoading}
              />
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={[
            styles.submitButton, 
            (!extractedText || isLoading) && styles.disabledButton
          ]} 
          onPress={handleSubmit}
          disabled={!extractedText || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit to Excel</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  imageSection: {
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#ddd',
  },
  placeholderImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    backgroundColor: '#007bff',
    marginRight: 8,
  },
  galleryButton: {
    backgroundColor: '#6c757d',
    marginLeft: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  textSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  textInputContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    minHeight: 200,
  },
  textInput: {
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 200,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#a0c9ab',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});