import { View, Text } from 'react-native'
import React, { createContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const ordersContext = createContext()

const OrdersProvider = ({children}) => {
    const [orders, setOrders] = useState([]) // Pedidos activos
    const [deliveredOrders, setDeliveredOrders] = useState([]) // Pedidos entregados
    const [cancelledOrders, setCancelledOrders] = useState([]) // Pedidos cancelados

    const loadOrders = async () => {
        try {
            // Cargar pedidos activos
            const existingOrders = await AsyncStorage.getItem('orders')
            if(existingOrders){
                const parseOrders = JSON.parse(existingOrders)
                const sortedOrders = parseOrders.sort((a,b)=>{
                    const dateA = new Date(a.fechaEntrega)
                    const dateB = new Date(b.fechaEntrega)
                    return dateA - dateB
                })
                setOrders(sortedOrders)
            } else {
                setOrders([])
            }
        } catch (error) {
            console.error('Error loading active orders:', error)
        }
    }

    const loadDeliveredOrders = async () => {
        try {
            const delivered = await AsyncStorage.getItem('deliveredOrders')
            if(delivered){
                const parseDelivered = JSON.parse(delivered)
                const sortedDelivered = parseDelivered.sort((a,b)=>{
                    const dateA = new Date(a.fechaEntrega)
                    const dateB = new Date(b.fechaEntrega)
                    return dateB - dateA // Más recientes primero
                })
                setDeliveredOrders(sortedDelivered)
            } else {
                setDeliveredOrders([])
            }
        } catch (error) {
            console.error('Error loading delivered orders:', error)
        }
    }

    const loadCancelledOrders = async () => {
        try {
            const cancelled = await AsyncStorage.getItem('cancelledOrders')
            if(cancelled){
                const parseCancelled = JSON.parse(cancelled)
                const sortedCancelled = parseCancelled.sort((a,b)=>{
                    const dateA = new Date(a.fechaEntrega)
                    const dateB = new Date(b.fechaEntrega)
                    return dateB - dateA // Más recientes primero
                })
                setCancelledOrders(sortedCancelled)
            } else {
                setCancelledOrders([])
            }
        } catch (error) {
            console.error('Error loading cancelled orders:', error)
        }
    }

    const loadAllOrders = async () => {
        await Promise.all([
            loadOrders(),
            loadDeliveredOrders(),
            loadCancelledOrders()
        ])
    }

    useEffect(()=>{
        loadAllOrders()
    }, [])

    return (
        <ordersContext.Provider value={{
            orders, 
            deliveredOrders,
            cancelledOrders,
            setOrders, 
            setDeliveredOrders,
            setCancelledOrders,
            loadOrders,
            loadDeliveredOrders,
            loadCancelledOrders,
            loadAllOrders
        }}>
            {children}
        </ordersContext.Provider>
    )
}

export {OrdersProvider}
