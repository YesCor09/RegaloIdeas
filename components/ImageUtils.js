import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export const saveImagePermanently = async (imageUri) => {
    try {
        // Crear directorio si no existe
        const directory = FileSystem.documentDirectory + 'images/';
        const dirInfo = await FileSystem.getInfoAsync(directory);
        
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
        }

        // Generar nombre único para la imagen
        const filename = `image_${Date.now()}.jpg`;
        const newPath = directory + filename;

        // Copiar imagen al directorio permanente
        await FileSystem.copyAsync({
            from: imageUri,
            to: newPath
        });

        return newPath;
    } catch (error) {
        console.error('Error saving image:', error);
        return null;
    }
};

export const pickImageWithPermanentStorage = async () => {
    try {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const permanentUri = await saveImagePermanently(result.assets[0].uri);
            return permanentUri;
        }
        
        return null;
    } catch (error) {
        console.error('Error picking image:', error);
        return null;
    }
};

export const checkImageExists = async (imageUri) => {
    try {
        if (!imageUri) return false;
        
        const fileInfo = await FileSystem.getInfoAsync(imageUri);
        return fileInfo.exists;
    } catch (error) {
        console.error('Error checking image:', error);
        return false;
    }
};