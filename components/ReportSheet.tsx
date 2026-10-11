import React, { useState } from 'react';
import { Modal, Platform, ScrollView, Share, Text, View } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { ui } from './PrototypeScreen';

export default function ReportSheet({ report, onClose }: { report: string | null; onClose: () => void }) {
  const [error, setError] = useState('');
  const exportReport = async () => {
    try {
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([report ?? ''], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = 'freshtrack-impact-report.txt';
        document.body.appendChild(link);
        link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else await Share.share({ message: report ?? '' });
    } catch { setError('Unable to export. You can select and copy the report below.'); }
  };
  return <Modal visible={!!report} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(19,27,46,0.4)' }}>
      <ScrollView style={{ maxHeight: '80%' }} contentContainerStyle={ui.card}>
        <Text style={ui.title}>Impact Report</Text><Text selectable style={ui.text}>{report}</Text>
        {!!error && <Text style={ui.text}>{error}</Text>}
        <PrimaryButton label={Platform.OS === 'web' ? 'Download Report' : 'Share Report'} onPress={exportReport} />
        <PrimaryButton label="Close" variant="ghost" onPress={onClose} />
      </ScrollView>
    </View>
  </Modal>;
}
