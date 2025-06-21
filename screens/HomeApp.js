"use client"

import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, StatusBar, Dimensions } from "react-native"
import React, { useContext, useState } from "react"
import { useFocusEffect } from "@react-navigation/native"
import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"

import { ordersContext } from "../components/OrdersProvider"

const { width } = Dimensions.get("window")

const HomeApp = ({ navigation }) => {
  const { orders, loadOrders } = useContext(ordersContext)
  const [activeTab, setActiveTab] = useState("active") // active, delivered, cancelled
  const [deliveredOrders, setDeliveredOrders] = useState([])
  const [cancelledOrders, setCancelledOrders] = useState([])

  // Cargar todas las listas de pedidos
  const loadAllOrders = async () => {
    try {
      // Cargar pedidos activos (desde el contexto)
      await loadOrders()

      // Cargar pedidos entregados
      const delivered = await AsyncStorage.getItem("deliveredOrders")
      if (delivered) {
        const parsedDelivered = JSON.parse(delivered)
        const sortedDelivered = parsedDelivered.sort((a, b) => {
          const dateA = new Date(a.fechaEntrega)
          const dateB = new Date(b.fechaEntrega)
          return dateB - dateA // Más recientes primero
        })
        setDeliveredOrders(sortedDelivered)
      } else {
        setDeliveredOrders([])
      }

      // Cargar pedidos cancelados
      const cancelled = await AsyncStorage.getItem("cancelledOrders")
      if (cancelled) {
        const parsedCancelled = JSON.parse(cancelled)
        const sortedCancelled = parsedCancelled.sort((a, b) => {
          const dateA = new Date(a.fechaEntrega)
          const dateB = new Date(b.fechaEntrega)
          return dateB - dateA // Más recientes primero
        })
        setCancelledOrders(sortedCancelled)
      } else {
        setCancelledOrders([])
      }
    } catch (error) {
      console.error("Error loading orders:", error)
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      loadAllOrders()
    }, []),
  )

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pendiente":
        return "#FF6B9D"
      case "en proceso":
        return "#FF8E53"
      case "realizado":
        return "#4ECDC4"
      case "completado":
        return "#4ECDC4"
      case "entregado":
        return "#45B7D1"
      case "cancelado":
        return "#FF6B6B"
      default:
        return "#FF6B9D"
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "pendiente":
        return "time-outline"
      case "en proceso":
        return "construct-outline"
      case "realizado":
        return "checkmark-circle-outline"
      case "completado":
        return "checkmark-circle-outline"
      case "entregado":
        return "gift-outline"
      case "cancelado":
        return "close-circle-outline"
      default:
        return "flower-outline"
    }
  }

  const getCurrentOrders = () => {
    switch (activeTab) {
      case "active":
        return orders
      case "delivered":
        return deliveredOrders
      case "cancelled":
        return cancelledOrders
      default:
        return orders
    }
  }

  const getTabInfo = (tab) => {
    switch (tab) {
      case "active":
        return {
          title: "Activos",
          icon: "flower",
          color: "#FF1493",
          bgColor: "#FFF0F5",
          count: orders.length,
        }
      case "delivered":
        return {
          title: "Entregados",
          icon: "gift",
          color: "#45B7D1",
          bgColor: "#E6F7FF",
          count: deliveredOrders.length,
        }
      case "cancelled":
        return {
          title: "Cancelados",
          icon: "close-circle",
          color: "#FF6B6B",
          bgColor: "#FFE6E6",
          count: cancelledOrders.length,
        }
    }
  }

  const formatCurrency = (amount) => {
    return `$${Number.parseFloat(amount || 0).toFixed(2)}`
  }

  // Función para formatear fecha de manera amigable CON UBICACIÓN
  const formatFriendlyDelivery = (dateString, timeString, ubicacion) => {
    try {
      const today = new Date()
      const orderDate = new Date(dateString)

      // Resetear horas para comparación de fechas
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())

      const diffTime = orderDateOnly.getTime() - todayDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
      const dayName = dayNames[orderDate.getDay()]

      let dateText = ""

      if (diffDays === 0) {
        dateText = "Hoy"
      } else if (diffDays === 1) {
        dateText = "Mañana"
      } else if (diffDays === -1) {
        dateText = "Ayer"
      } else if (diffDays > 1 && diffDays <= 7) {
        dateText = dayName
      } else if (diffDays < -1 && diffDays >= -7) {
        dateText = dayName
      } else {
        // Para fechas más lejanas, mostrar fecha completa
        dateText = orderDate.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
        })
      }

      // Agregar hora si existe
      let fullText = dateText
      if (timeString && timeString.trim() !== "") {
        // Formatear la hora
        const [hours, minutes] = timeString.split(":")
        const hour24 = Number.parseInt(hours)
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
        const ampm = hour24 >= 12 ? "PM" : "AM"
        const formattedTime = `${hour12}:${minutes} ${ampm}`

        if (diffDays === 0) {
          fullText = `Hoy ${dayName} a las ${formattedTime}`
        } else if (diffDays === 1) {
          fullText = `Mañana ${dayNames[orderDate.getDay()]} a las ${formattedTime}`
        } else {
          fullText = `${dateText} a las ${formattedTime}`
        }
      }

      // Agregar ubicación si existe
      if (ubicacion && ubicacion.trim() !== "") {
        fullText += ` en ${ubicacion}`
      }

      return fullText
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  // Función para calcular el total de abonos
  const getTotalAbonos = (order) => {
    if (!order.historialAbonos || order.historialAbonos.length === 0) {
      return 0
    }
    return order.historialAbonos.reduce((total, abono) => total + Number.parseFloat(abono.monto), 0)
  }

  // Función para calcular el restante real
  const getRealRestante = (order) => {
    const costoTotal = Number.parseFloat(order.costoTotal) || 0
    const costoEnvio = Number.parseFloat(order.costoEnvio) || 0
    const totalAbonos = getTotalAbonos(order)

    return (costoTotal + costoEnvio - totalAbonos).toFixed(2)
  }

  const renderOrderCard = (order, index) => {
    const totalAbonos = getTotalAbonos(order)
    const restanteReal = getRealRestante(order)
    const isPaid = Number.parseFloat(restanteReal) <= 0 && Number.parseFloat(order.costoTotal) > 0

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("OrderView", {
            idOrder: order.id,
          })
        }
        key={index}
        style={[
          styles.orderCard,
          {
            shadowColor: getStatusColor(order.status),
          },
        ]}
        activeOpacity={0.95}
      >
        {/* Indicador de estado */}
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(order.status) }]}>
          <Ionicons name={getStatusIcon(order.status)} size={16} color="white" />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: order.image }} style={styles.orderImage} />
            <View style={styles.imageOverlay}>
              <Ionicons name="rose" size={20} color="rgba(255, 255, 255, 0.93)" />
            </View>
          </View>

          <View style={styles.orderInfo}>
            <Text style={styles.orderName}>{order.name}</Text>

            {/* Precio simple y llamativo en la parte superior */}
            <View style={styles.priceTag}>
              <Text style={styles.priceAmount}>{formatCurrency(order.costoTotal)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="color-palette" size={14} color="#FF69B4" />
              <Text style={styles.infoText}>Color: {order.color}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                name={isPaid ? "checkmark-circle" : "layers"}
                size={14}
                color={isPaid ? "#4ECDC4" : "#FF8E53"}
              />
              <Text
                style={[
                  styles.infoText,
                  isPaid && {
                    color: "#4ECDC4",
                    fontWeight: "600",
                  },
                ]}
              >
                {isPaid ? "Pagado ✅" : `Restante: ${formatCurrency(restanteReal)}`}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name={getStatusIcon(order.status)} size={14} color={getStatusColor(order.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{order.status}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location" size={14} color="#4ECDC4" />
              <Text style={styles.infoText} numberOfLines={1}>
                {order.ubicacionEnvio}
              </Text>
            </View>

            <View style={styles.deliveryContainer}>
              <Ionicons name="calendar" size={16} color="#FF1493" />
              <Text style={styles.deliveryText}>
                {activeTab === "delivered" ? "Entregado: " : activeTab === "cancelled" ? "Cancelado: " : "Entrega: "}
                {formatFriendlyDelivery(order.fechaEntrega, order.horaEntrega, order.ubicacionEnvio)}
              </Text>
            </View>
          </View>

          <View style={styles.cardArrow}>
            <Ionicons name="chevron-forward" size={24} color="#FF69B4" />
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderEmptyState = () => {
    const tabInfo = getTabInfo(activeTab)
    let emptyMessage = ""
    let emptyIcon = ""

    switch (activeTab) {
      case "active":
        emptyMessage = "¡Crea tu primer pedido!"
        emptyIcon = "rose-outline"
        break
      case "delivered":
        emptyMessage = "Aún no hay pedidos entregados"
        emptyIcon = "gift-outline"
        break
      case "cancelled":
        emptyMessage = "No hay pedidos cancelados"
        emptyIcon = "close-circle-outline"
        break
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={emptyIcon} size={80} color={tabInfo.color} />
        <Text style={[styles.emptyTitle, { color: tabInfo.color }]}>No hay pedidos {tabInfo.title.toLowerCase()}</Text>
        <Text style={[styles.emptySubtitle, { color: tabInfo.color }]}>{emptyMessage}</Text>
      </View>
    )
  }

  const currentOrders = getCurrentOrders()

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF1493" />

      {/* Header con gradiente */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoShadow}>
            <Image source={require("../assets/logo.png")} style={styles.logo} />
          </View>
          <View style={styles.sparkleContainer}>
            <Ionicons name="sparkles" size={20} color="#FFD700" style={styles.sparkle1} />
            <Ionicons name="sparkles" size={16} color="#FF69B4" style={styles.sparkle2} />
            <Ionicons name="sparkles" size={12} color="#FF1493" style={styles.sparkle3} />
          </View>
        </View>

        <Text style={styles.welcomeText}>¡Bienvenida!</Text>
        <Text style={styles.subtitleText}>Gestiona tus pedidos de rosas 🌹</Text>

        {/* Botón mejorado */}
        <TouchableOpacity onPress={() => navigation.navigate("NewOrder")} style={styles.addButton} activeOpacity={0.8}>
          <View style={styles.buttonGradient}>
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.buttonText}>Añadir Pedido</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Contenedor principal con pestañas */}
      <View style={styles.mainContainer}>
        {/* Pestañas */}
        <View style={styles.tabsContainer}>
          {["active", "delivered", "cancelled"].map((tab) => {
            const tabInfo = getTabInfo(tab)
            const isActive = activeTab === tab

            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  isActive && styles.activeTab,
                  { backgroundColor: isActive ? tabInfo.color : "transparent" },
                ]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <View style={styles.tabContent}>
                  <Ionicons name={tabInfo.icon} size={20} color={isActive ? "white" : tabInfo.color} />
                  <Text style={[styles.tabText, { color: isActive ? "white" : tabInfo.color }]}>{tabInfo.title}</Text>
                  {tabInfo.count > 0 && (
                    <View
                      style={[styles.tabBadge, { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : tabInfo.color }]}
                    >
                      <Text style={[styles.tabBadgeText, { color: isActive ? "white" : "white" }]}>
                        {tabInfo.count}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Contenido de la pestaña activa */}
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.ordersHeader}>
            <Text style={[styles.ordersTitle, { color: getTabInfo(activeTab).color }]}>
              Pedidos {getTabInfo(activeTab).title}
            </Text>
            <View style={[styles.ordersBadge, { backgroundColor: getTabInfo(activeTab).color }]}>
              <Text style={styles.ordersCount}>{currentOrders.length}</Text>
            </View>
          </View>

          <View style={styles.ordersContainer}>
            {currentOrders.length > 0
              ? currentOrders.map((order, index) => renderOrderCard(order, index))
              : renderEmptyState()}
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

export { HomeApp }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF1493",
    paddingBottom: 0,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  logoContainer: {
    position: "relative",
    marginBottom: 0,
  },
  logoShadow: {
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "white",
  },
  sparkleContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  sparkle1: {
    position: "absolute",
    top: -5,
    right: 10,
  },
  sparkle2: {
    position: "absolute",
    bottom: 20,
    left: -5,
  },
  sparkle3: {
    position: "absolute",
    top: 30,
    left: -10,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitleText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 25,
    textAlign: "center",
  },
  addButton: {
    width: width - 40,
    height: 55,
    borderRadius: 27.5,
    overflow: "hidden",
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF69B4",
    paddingHorizontal: 20,
    gap: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFF0F5",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -15,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 10,
  },
  tab: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  tabBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50, // Aumentar padding bottom
  },
  ordersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  ordersTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  ordersBadge: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ordersCount: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  ordersContainer: {
    paddingHorizontal: 15,
  },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 20,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
    position: "relative",
  },
  statusIndicator: {
    position: "absolute",
    top: 15,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  cardContent: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
  },
  imageContainer: {
    position: "relative",
  },
  orderImage: {
    width: 80,
    height: 80,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#FFB6C1",
  },
  imageOverlay: {
    position: "absolute",
    bottom: -5,
    right: -5,
    backgroundColor: "#FF69B4",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  orderInfo: {
    flex: 1,
    paddingLeft: 15,
    paddingRight: 10,
  },
  orderName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#7F8C8D",
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  deliveryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#FFE4E1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  deliveryText: {
    color: "#FF1493",
    fontSize: 13,
    fontWeight: "600",
  },
  cardArrow: {
    paddingLeft: 10,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.7,
  },
  priceTag: {
    alignSelf: "flex-start",
    backgroundColor: "#FF1493",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 8,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
})
