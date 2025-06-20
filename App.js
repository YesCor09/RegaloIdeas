import { StyleSheet, Text, View } from 'react-native';
import { Stacks } from './components/Stacks';


export default function App() {
    return (
        <View style={styles.container}>
            <Stacks/>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
