import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Platform, Alert } from 'react-native';

export const exportToCSV = async (words: any[]) => {
  if (words.length === 0) {
    Alert.alert('No Words', 'You have no saved words to export.');
    return;
  }

  try {
    // 1. Prepare CSV Content
    const header = 'Word,Definition,Saved At\n';
    const rows = words.map(w => {
      // Clean definition of commas and newlines
      const cleanDef = w.definition.replace(/,/g, ';').replace(/\n/g, ' ');
      return `"${w.word}","${cleanDef}","${w.savedAt}"`;
    }).join('\n');
    
    const csvContent = header + rows;

    // 2. Write to local file
    const path = `${RNFS.TemporaryDirectoryPath}/dictozo_export_${Date.now()}.csv`;
    await RNFS.writeFile(path, csvContent, 'utf8');

    // 3. Share the file
    const shareOptions = {
      title: 'Export Saved Words',
      url: `file://${path}`,
      type: 'text/csv',
      failOnCancel: false,
    };

    await Share.open(shareOptions);
    
    // Optional: Clean up temp file (though temp dir handles this eventually)
    // await RNFS.unlink(path);
    
  } catch (error: any) {
    if (error.message !== 'User did not share') {
       Alert.alert('Export Failed', 'An error occurred while generating the CSV file.');
       console.error('Export Error:', error);
    }
  }
};
