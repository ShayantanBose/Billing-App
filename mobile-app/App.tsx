import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Button } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import ConfigScreen from './src/screens/ConfigScreen';

export default function App() {
  const [screen, setScreen] = useState<'Home' | 'Config'>('Home');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.nav}>
          {screen === 'Home' ? (
              <Button title="Settings" onPress={() => setScreen('Config')} />
          ) : (
              <Button title="Back to Home" onPress={() => setScreen('Home')} />
          )}
      </View>

      {screen === 'Home' ? <HomeScreen navigation={{}} /> : <ConfigScreen />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  nav: {
      padding: 10,
      alignItems: 'flex-end',
      borderBottomWidth: 1,
      borderBottomColor: '#eee'
  }
});
