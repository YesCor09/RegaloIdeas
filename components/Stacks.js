import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OrdersProvider } from './OrdersProvider.js';

import {HomeApp} from '../screens/HomeApp.js';
import {NewOrder} from '../screens/NewOrder.js';
import {OrderView} from '../screens/OrderView.js';

const Stack = createNativeStackNavigator();

export function Stacks() {
    return (
        <OrdersProvider>
            <NavigationContainer>
                <Stack.Navigator initialRouteName="HomeApp" screenOptions={{headerShown: false}}>
                    <Stack.Screen 
                        name="HomeApp" 
                        component={HomeApp} 
                        options={{ title: 'Home' }} 
                    />
                    <Stack.Screen 
                        name="NewOrder" 
                        component={NewOrder} 
                        options={{ title: 'NewOrder' }} 
                    />
                    <Stack.Screen
                        name="OrderView"
                        component={OrderView}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </OrdersProvider>
    );
}
