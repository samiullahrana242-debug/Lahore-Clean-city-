import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export default function App() {
  const [isConnected, setIsConnected] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // 1. انٹرنیٹ کنکشن مانیٹر کرنا
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (state.isConnected) {
        triggerAutomaticSync(); // نیٹ آتے ہی خودکار سنک شروع کریں
      }
    });
    updateQueueCount();
    return () => unsubscribe();
  }, []);

  const updateQueueCount = async () => {
    const stored = await AsyncStorage.getItem('@lahore_clean_offline_logs');
    if (stored) {
      setOfflineQueueCount(JSON.parse(stored).length);
    }
  };

  // 2. کچرے یا اسموگ کے خطرے کی رپورٹ درج کرنا
  const createCivicReport = async (issueType) => {
    const reportData = {
      reportId: `LHR-${Date.now()}`,
      issueType: issueType,
      location: { latitude: 31.5204, longitude: 74.3587 }, // لاہور کی لائیو لوکیشن (فرضی)
      timestamp: new Date().toISOString(),
      isSyncedOffline: !isConnected
    };

    if (isConnected) {
      // اگر آن لائن ہیں تو لائیو سرور پر بھیجیں
      sendToServer(reportData);
    } else {
      // 🚀 ٹاپ فیچر: انٹرنیٹ نہ ہونے پر آف لائن بفر میں سیو کریں
      try {
        const stored = await AsyncStorage.getItem('@lahore_clean_offline_logs');
        const queue = stored ? JSON.parse(stored) : [];
        queue.push(reportData);
        await AsyncStorage.setItem('@lahore_clean_offline_logs', JSON.stringify(queue));
        setOfflineQueueCount(queue.length);
        
        Alert.alert(
          "آف لائن محفوظ! (Offline Resiliency)", 
          "لاہور میں انٹرنیٹ کے مسائل کی وجہ سے آپ کی رپورٹ فون کی میموری میں محفوظ کر لی گئی ہے۔ جیسے ہی انٹرنیٹ بحال ہوگا، یہ خودکار اپ لوڈ ہو جائے گی۔"
        );
      } catch (err) {
        console.log("Storage Error", err);
      }
    }
  };

  // 3. سرور پر ڈیٹا پوسٹ کرنا
  const sendToServer = async (data) => {
    try {
      const response = await fetch('https://your-lahore-clean-city-api.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert("رپورٹ جمع ہو گئی!", `AI اسکور: ${result.reportDetails.aiAnalysis.smogRiskScore}. کارروائی شروع کر دی گئی ہے۔`);
      }
    } catch (error) {
      console.log("Network Post Failed", error);
    }
  };

  // 4. آف لائن ڈیٹا کو خودکار سنک (Sync) کرنا
  const triggerAutomaticSync = async () => {
    const stored = await AsyncStorage.getItem('@lahore_clean_offline_logs');
    if (stored) {
      const queue = JSON.parse(stored);
      if (queue.length > 0) {
        for (let offlineReport of queue) {
          await sendToServer(offlineReport);
        }
        await AsyncStorage.removeItem('@lahore_clean_offline_logs');
        setOfflineQueueCount(0);
        Alert.alert("سنک مکمل! 🎉", "تمام آف لائن جمع شدہ رپورٹس کامیابی سے سرور پر منتقل کر دی گئی ہیں۔");
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.mainTitle}>🌳 لاہور کلین سٹی 🌳</Text>
      <Text style={styles.subTitle}>Smart City Hackathon Lahore 2026</Text>
      
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>
          انٹرنیٹ کنکشن: {isConnected ? "🟢 آن لائن (LIVE)" : "🔴 آف لائن (BUFFERING)"}
        </Text>
        <Text style={styles.queueText}>
          فون میں محفوظ آف لائن رپورٹس: {offlineQueueCount}
        </Text>
      </View>

      <View style={styles.btnContainer}>
        <Button title="کچرے کے ڈھیر کی رپورٹ کریں" color="#2e7d32" onPress={() => createCivicReport("Normal Garbage Dump")} />
      </View>

      <View style={styles.btnContainer}>
        <Button title="🔥 کچرا جلانے / اسموگ الرٹ (Critical)" color="#d32f2f" onPress={() => createCivicReport("CRITICAL: Garbage Burning Detected")} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 20 },
  mainTitle: { fontSize: 26, fontWeight: 'bold', color: '#1b5e20', marginBottom: 5 },
  subTitle: { fontSize: 14, color: '#666', marginBottom: 30 },
  statusBox: { width: '100%', padding: 15, backgroundColor: '#fff', borderRadius: 10, elevation: 2, marginBottom: 30 },
  statusText: { fontSize: 16, fontWeight: '600', marginBottom: 5 },
  queueText: { fontSize: 14, color: '#ffa000', fontWeight: 'bold' },
  btnContainer: { width: '100%', marginBottom: 15, borderRadius: 8, overflow: 'hidden' }
});
