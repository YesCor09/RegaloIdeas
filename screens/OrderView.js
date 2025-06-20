"use client"

import {
  Alert,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Pressable,
  Platform,
} from "react-native"
import { useContext, useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Picker } from "@react-native-picker/picker"
import { format } from "date-fns"
import { ordersContext } from "../components/OrdersProvider"
import { pickImageWithPermanentStorage } from "../components/ImageUtils"
import { PreciosEnvios, findPrecioByUbicacion } from "../data/PreciosEnvios"

const { width, height } = Dimensions.get("window")

const OrderView = ({ route, navigation }) => {
  const { idOrder } = route.params
  const { orders, deliveredOrders, cancelledOrders, loadAllOrders } = useContext(ordersContext)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [newAbono, setNewAbono] = useState("") // Campo separado para nuevo abono
  const [showTimePicker, setShowTimePicker] = useState(false) // Para el selector de hora
  const insets = useSafeAreaInsets() // Hook para obtener las áreas seguras

  // Estados editables del pedido
  const [editedOrder, setEditedOrder] = useState({})
  const [originalOrder, setOriginalOrder] = useState({})
  const [orderSource, setOrderSource] = useState("")

  const pickerRef = useRef()

  // Buscar el pedido usando useMemo para evitar re-renders
  const order = useMemo(() => {
    // Buscar en pedidos activos
    let foundOrder = orders.find((o) => o.id === idOrder)
    if (foundOrder) {
      setOrderSource("active")
      return foundOrder
    }

    // Buscar en pedidos entregados
    foundOrder = deliveredOrders.find((o) => o.id === idOrder)
    if (foundOrder) {
      setOrderSource("delivered")
      return foundOrder
    }

    // Buscar en pedidos cancelados
    foundOrder = cancelledOrders.find((o) => o.id === idOrder)
    if (foundOrder) {
      setOrderSource("cancelled")
      return foundOrder
    }

    return null
  }, [orders, deliveredOrders, cancelledOrders, idOrder])

  // Función para calcular el total de abonos
  const getTotalAbonos = useCallback((orderData) => {
    if (!orderData.historialAbonos || orderData.historialAbonos.length === 0) {
      return 0
    }
    return orderData.historialAbonos.reduce((total, abono) => total + Number.parseFloat(abono.monto), 0)
  }, [])

  // Función para calcular el restante real
  const getRealRestante = useCallback(
    (orderData) => {
      const costoTotal = Number.parseFloat(orderData.costoTotal) || 0
      const costoEnvio = Number.parseFloat(orderData.costoEnvio) || 0
      const totalAbonos = getTotalAbonos(orderData)

      return (costoTotal + costoEnvio - totalAbonos).toFixed(2)
    },
    [getTotalAbonos],
  )

  // Inicializar estados cuando se encuentra el pedido
  useEffect(() => {
    if (order && Object.keys(originalOrder).length === 0) {
      const orderCopy = { ...order }
      // Inicializar historial de abonos si no existe
      if (!orderCopy.historialAbonos) {
        orderCopy.historialAbonos = []
      }
      setEditedOrder(orderCopy)
      setOriginalOrder(orderCopy)
    }
  }, [order])

  // Función para actualizar campos
  const updateField = useCallback((field, value) => {
    setEditedOrder((prev) => {
      if (prev[field] !== value) {
        const updated = { ...prev, [field]: value }
        return updated
      }
      return prev
    })
  }, [])

  // Detectar cambios de forma simple
  useEffect(() => {
    if (Object.keys(originalOrder).length > 0 && Object.keys(editedOrder).length > 0) {
      const hasDataChanges = JSON.stringify(editedOrder) !== JSON.stringify(originalOrder) || newAbono.trim() !== ""
      setHasChanges(hasDataChanges)
    }
  }, [editedOrder, originalOrder, newAbono])

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#FF69B4" />
        <Text style={styles.errorText}>Pedido no encontrado!</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Regresar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const statusOptions = [
    {
      key: "En proceso",
      label: "En Proceso",
      color: "#FF8E53",
      icon: "construct-outline",
      bgColor: "#FFF4E6",
    },
    {
      key: "Realizado",
      label: "Realizado",
      color: "#4ECDC4",
      icon: "checkmark-circle-outline",
      bgColor: "#E6FFFA",
    },
    {
      key: "Entregado",
      label: "Entregado",
      color: "#45B7D1",
      icon: "gift-outline",
      bgColor: "#E6F7FF",
    },
    {
      key: "Cancelado",
      label: "Cancelado",
      color: "#FF6B6B",
      icon: "close-circle-outline",
      bgColor: "#FFE6E6",
    },
  ]

  const getStatusInfo = (status) => {
    return statusOptions.find((s) => s.key === status) || statusOptions[0]
  }

  // Función para seleccionar imagen
  const pickImage = async () => {
    try {
      setImageLoading(true)
      const permanentImageUri = await pickImageWithPermanentStorage()

      if (permanentImageUri) {
        updateField("image", permanentImageUri)
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error)
      Alert.alert("Error", "No se pudo seleccionar la imagen")
    } finally {
      setImageLoading(false)
    }
  }

  // Función para manejar cambio de fecha
  const onDateChange = ({ type }, selectedDate) => {
    if (type === "set") {
      const currentDate = selectedDate
      if (Platform.OS === "android") {
        setShowDatePicker(false)
      }
      updateField("fechaEntrega", currentDate.toDateString())
    } else {
      setShowDatePicker(false)
    }
  }

  const onTimeChange = ({ type }, selectedTime) => {
    if (type === "set") {
      if (Platform.OS === "android") {
        setShowTimePicker(false)
      }
      if (selectedTime) {
        const hours = selectedTime.getHours().toString().padStart(2, "0")
        const minutes = selectedTime.getMinutes().toString().padStart(2, "0")
        updateField("horaEntrega", `${hours}:${minutes}`)
      }
    } else {
      setShowTimePicker(false)
    }
  }

  // Función para mover pedidos entre listas
  const moveOrderToList = async (updatedOrder) => {
    try {
      const existingOrders = await AsyncStorage.getItem("orders")
      const deliveredOrdersStorage = await AsyncStorage.getItem("deliveredOrders")
      const cancelledOrdersStorage = await AsyncStorage.getItem("cancelledOrders")

      let allOrders = existingOrders ? JSON.parse(existingOrders) : []
      let delivered = deliveredOrdersStorage ? JSON.parse(deliveredOrdersStorage) : []
      let cancelled = cancelledOrdersStorage ? JSON.parse(cancelledOrdersStorage) : []

      // Remover el pedido de todas las listas
      allOrders = allOrders.filter((o) => o.id !== idOrder)
      delivered = delivered.filter((o) => o.id !== idOrder)
      cancelled = cancelled.filter((o) => o.id !== idOrder)

      // Agregar a la lista correspondiente según el nuevo estado
      switch (updatedOrder.status) {
        case "En proceso":
        case "Realizado":
          allOrders.push(updatedOrder)
          break
        case "Entregado":
          delivered.push(updatedOrder)
          break
        case "Cancelado":
          cancelled.push(updatedOrder)
          break
      }

      // Guardar todas las listas actualizadas
      await AsyncStorage.setItem("orders", JSON.stringify(allOrders))
      await AsyncStorage.setItem("deliveredOrders", JSON.stringify(delivered))
      await AsyncStorage.setItem("cancelledOrders", JSON.stringify(cancelled))

      return true
    } catch (error) {
      console.error("Error moving order:", error)
      return false
    }
  }

  // Función para guardar todos los cambios
  const saveAllChanges = async () => {
    if (!hasChanges) {
      Alert.alert("Sin cambios", "No hay cambios para guardar")
      return
    }

    try {
      // Validaciones básicas
      if (!editedOrder.name?.trim()) {
        Alert.alert("Error", "El nombre del cliente es requerido")
        return
      }

      if (!editedOrder.fechaEntrega) {
        Alert.alert("Error", "La fecha de entrega es requerida")
        return
      }

      // Formatear fecha si es necesario
      const formattedOrder = { ...editedOrder }
      if (editedOrder.fechaEntrega && typeof editedOrder.fechaEntrega === "object") {
        formattedOrder.fechaEntrega = format(new Date(editedOrder.fechaEntrega), "yyyy-MM-dd")
      }

      // Verificar si hay un nuevo abono para agregar al historial
      const nuevoAbonoMonto = Number.parseFloat(newAbono) || 0

      if (nuevoAbonoMonto > 0) {
        // Inicializar historial si no existe
        if (!formattedOrder.historialAbonos) {
          formattedOrder.historialAbonos = []
        }

        // Agregar nuevo abono al historial
        const nuevoAbonoRegistro = {
          id: Date.now().toString(),
          monto: nuevoAbonoMonto.toFixed(2),
          fecha: new Date().toLocaleDateString("es-ES", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          totalAnterior: getTotalAbonos(originalOrder).toFixed(2),
        }

        formattedOrder.historialAbonos.push(nuevoAbonoRegistro)
      }

      // Mover el pedido a la lista correspondiente
      const success = await moveOrderToList(formattedOrder)

      if (success) {
        await loadAllOrders() // Recargar todas las listas
        setOriginalOrder({ ...formattedOrder })
        setNewAbono("") // Limpiar el campo de nuevo abono
        setHasChanges(false)

        // Mostrar mensaje según el estado
        let message = "Pedido actualizado correctamente ✅"
        let shouldNavigateBack = false

        // Si cambió de lista, navegar de vuelta
        const newSource =
          formattedOrder.status === "Entregado"
            ? "delivered"
            : formattedOrder.status === "Cancelado"
              ? "cancelled"
              : "active"

        if (orderSource !== newSource) {
          shouldNavigateBack = true
          switch (formattedOrder.status) {
            case "Entregado":
              message = 'Pedido actualizado y movido a "Entregados" 🎁'
              break
            case "Cancelado":
              message = 'Pedido actualizado y movido a "Cancelados" ❌'
              break
            case "En proceso":
            case "Realizado":
              message = 'Pedido actualizado y movido a "Activos" 🌹'
              break
          }
        }

        // Agregar mensaje si se registró un nuevo abono
        if (nuevoAbonoMonto > 0) {
          message += `\n💰 Nuevo abono registrado: $${nuevoAbonoMonto.toFixed(2)}`
        }

        Alert.alert("¡Cambios Guardados! 🌹", message, [
          {
            text: "OK",
            onPress: () => {
              if (shouldNavigateBack) {
                navigation.goBack()
              }
            },
          },
        ])
      } else {
        Alert.alert("Error", "No se pudieron guardar los cambios")
      }
    } catch (error) {
      Alert.alert("Error", "No se pudieron guardar los cambios")
      console.error(error)
    }
  }

  const statusInfo = getStatusInfo(editedOrder.status)

  const formatCurrency = (amount) => {
    return `$${Number.parseFloat(amount || 0).toFixed(2)}`
  }

  // Calcular valores actuales
  const totalAbonos = getTotalAbonos(editedOrder)
  const restanteReal = getRealRestante(editedOrder)
  const isPaid = Number.parseFloat(restanteReal) <= 0 && Number.parseFloat(editedOrder.costoTotal) > 0

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#FF1493" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (hasChanges) {
              Alert.alert("Cambios sin guardar", "¿Deseas salir sin guardar los cambios?", [
                { text: "Cancelar", style: "cancel" },
                { text: "Salir", onPress: () => navigation.goBack() },
              ])
            } else {
              navigation.goBack()
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Pedido</Text>
        <View style={styles.headerButton}>
          {hasChanges && (
            <View style={styles.changesIndicator}>
              <Ionicons name="create" size={20} color="white" />
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Imagen principal - CLICKEABLE */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Foto del Arreglo</Text>

          <View style={styles.imageContainer}>
            <TouchableOpacity onPress={() => setShowImageModal(true)} activeOpacity={0.8}>
              <Image source={{ uri: editedOrder.image }} style={styles.orderImage} />
              <View style={styles.expandIcon}>
                <Ionicons name="expand-outline" size={16} color="white" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.changeImageButton} onPress={pickImage} disabled={imageLoading}>
              {imageLoading ? (
                <Ionicons name="hourglass" size={20} color="white" />
              ) : (
                <Ionicons name="camera" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {/* Estado del pedido */}
          <TouchableOpacity
            style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.bgColor },
              hasChanges && styles.statusBadgeChanged,
            ]}
            onPress={() => setShowStatusModal(true)}
          >
            <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            <Ionicons name="chevron-down" size={16} color={statusInfo.color} />
          </TouchableOpacity>

          {hasChanges && <Text style={styles.changesText}>Cambios pendientes por guardar</Text>}
        </View>

        {/* Información del cliente - EDITABLE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="person" size={20} color="#FF1493" /> Cliente
          </Text>

          <View style={styles.editableCard}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nombre del cliente</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={editedOrder.name || ""}
                  onChangeText={(text) => updateField("name", text)}
                  placeholder="Nombre completo"
                  placeholderTextColor="#FFB6C1"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Teléfono</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={editedOrder.telefono || ""}
                  onChangeText={(text) => updateField("telefono", text)}
                  placeholder="Teléfono"
                  keyboardType="phone-pad"
                  placeholderTextColor="#FFB6C1"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Detalles del pedido - EDITABLE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="rose" size={20} color="#FF1493" /> Detalles del Arreglo
          </Text>

          <View style={styles.editableCard}>
            <View style={styles.rowContainer}>
              <View style={styles.halfInputContainer}>
                <Text style={styles.inputLabel}>Color de rosas</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="color-palette-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={editedOrder.color || ""}
                    onChangeText={(text) => updateField("color", text)}
                    placeholder="Color"
                    placeholderTextColor="#FFB6C1"
                  />
                </View>
              </View>

              <View style={styles.halfInputContainer}>
                <Text style={styles.inputLabel}>Cantidad</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="flower-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={editedOrder.cantidad || ""}
                    onChangeText={(text) => updateField("cantidad", text)}
                    placeholder="# rosas"
                    keyboardType="numeric"
                    placeholderTextColor="#FFB6C1"
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Frase especial</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="chatbubble-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={editedOrder.frase || ""}
                  onChangeText={(text) => updateField("frase", text)}
                  placeholder="Frase especial"
                  placeholderTextColor="#FFB6C1"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Información financiera - EDITABLE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="card" size={20} color="#FF1493" /> Información Financiera
            </Text>
            {editedOrder.historialAbonos && editedOrder.historialAbonos.length > 0 && (
              <TouchableOpacity style={styles.historyButton} onPress={() => setShowPaymentHistoryModal(true)}>
                <Ionicons name="time-outline" size={16} color="#FF1493" />
                <Text style={styles.historyButtonText}>Historial</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.editableCard}>
            {/* Costo del arreglo */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Costo del arreglo</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="cash-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={editedOrder.costoTotal || ""}
                  onChangeText={(text) => updateField("costoTotal", text)}
                  placeholder="$0.00"
                  keyboardType="numeric"
                  placeholderTextColor="#FFB6C1"
                />
              </View>
            </View>

            {/* Resumen de abonos */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total abonado:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalAbonos)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Costo + Envío:</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(
                    (Number.parseFloat(editedOrder.costoTotal) || 0) + (Number.parseFloat(editedOrder.costoEnvio) || 0),
                  )}
                </Text>
              </View>
            </View>

            {/* Nuevo abono */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Agregar nuevo abono</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="add-circle-outline" size={20} color="#4ECDC4" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={newAbono}
                  onChangeText={setNewAbono}
                  placeholder="$0.00"
                  keyboardType="numeric"
                  placeholderTextColor="#FFB6C1"
                />
              </View>
            </View>

            {/* Total restante */}
            <View style={[styles.totalCard, isPaid && styles.paidCard]}>
              <Ionicons
                name={isPaid ? "checkmark-circle-outline" : "calculator-outline"}
                size={20}
                color={isPaid ? "#4ECDC4" : "#FF1493"}
              />
              <Text style={[styles.totalText, isPaid && styles.paidText]}>
                {isPaid ? "Pagado ✅" : `Total restante: ${formatCurrency(restanteReal)}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Entrega - EDITABLE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="location" size={20} color="#FF1493" /> Información de Entrega
          </Text>

          <View style={styles.editableCard}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Fecha de entrega</Text>
              <Pressable onPress={() => setShowDatePicker(true)}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={editedOrder.fechaEntrega || ""}
                    placeholder="Selecciona fecha"
                    editable={false}
                    placeholderTextColor="#FFB6C1"
                  />
                </View>
              </Pressable>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Hora de entrega</Text>
              <Pressable onPress={() => setShowTimePicker(true)}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="time-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={editedOrder.horaEntrega || ""}
                    placeholder="Selecciona hora"
                    editable={false}
                    placeholderTextColor="#FFB6C1"
                  />
                </View>
              </Pressable>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Ubicación de entrega</Text>
              <View style={styles.pickerContainer}>
                <Ionicons name="map-outline" size={20} color="#FF69B4" style={styles.pickerIcon} />
                <Picker
                  ref={pickerRef}
                  style={styles.picker}
                  selectedValue={editedOrder.ubicacionEnvio || ""}
                  onValueChange={(itemValue) => {
                    updateField("ubicacionEnvio", itemValue)
                    const precioInfo = findPrecioByUbicacion(itemValue)
                    if (precioInfo) {
                      updateField("costoEnvio", precioInfo.precio)
                    }
                  }}
                >
                  <Picker.Item label="Selecciona ubicación" value="" />
                  {Object.values(PreciosEnvios).map((item, index) => (
                    <Picker.Item key={index} label={item.ubicacion} value={item.ubicacion} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Referencias de ubicación</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="document-text-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={editedOrder.referencias || ""}
                  onChangeText={(text) => updateField("referencias", text)}
                  placeholder="Casa blanca, portón azul, etc..."
                  placeholderTextColor="#FFB6C1"
                  multiline={true}
                  numberOfLines={2}
                />
              </View>
            </View>

            {editedOrder.costoEnvio && (
              <View style={styles.costCard}>
                <Ionicons name="car-outline" size={20} color="#FF1493" />
                <Text style={styles.costText}>Costo de envío: {formatCurrency(editedOrder.costoEnvio)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Comentarios - EDITABLE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="chatbubbles" size={20} color="#FF1493" /> Comentarios Adicionales
          </Text>

          <View style={styles.textAreaWrapper}>
            <Ionicons name="document-text-outline" size={20} color="#FF69B4" style={styles.textAreaIcon} />
            <TextInput
              value={editedOrder.comentario || ""}
              onChangeText={(text) => updateField("comentario", text)}
              multiline={true}
              numberOfLines={4}
              placeholder="Notas especiales, instrucciones adicionales..."
              placeholderTextColor="#FFB6C1"
              style={styles.textArea}
            />
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Botones fijos en la parte inferior */}
      <View style={[styles.bottomButtons, { bottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={styles.selectStatusButton} onPress={() => setShowStatusModal(true)}>
          <Ionicons name="list-outline" size={20} color="#FF1493" />
          <Text style={styles.selectStatusText}>Estado</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
          onPress={saveAllChanges}
          disabled={!hasChanges}
        >
          <Ionicons name="save-outline" size={20} color="white" />
          <Text style={styles.saveButtonText}>{hasChanges ? "Guardar Cambios" : "Sin Cambios"}</Text>
        </TouchableOpacity>
      </View>

      {/* Modal para imagen ampliada */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setShowImageModal(false)}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>

          <View style={styles.imageModalContent}>
            <Image source={{ uri: editedOrder.image }} style={styles.enlargedImage} resizeMode="contain" />
            <Text style={styles.imageModalText}>Arreglo de {editedOrder.name}</Text>
          </View>
        </View>
      </Modal>

      {/* Modal para historial de abonos */}
      <Modal
        visible={showPaymentHistoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Historial de Abonos</Text>
              <TouchableOpacity onPress={() => setShowPaymentHistoryModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FF1493" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.historyScrollView}>
              {editedOrder.historialAbonos && editedOrder.historialAbonos.length > 0 ? (
                editedOrder.historialAbonos
                  .slice()
                  .reverse()
                  .map((abono, index) => (
                    <View key={abono.id} style={styles.historyItem}>
                      <View style={styles.historyItemHeader}>
                        <View style={styles.historyItemIcon}>
                          <Ionicons name="cash" size={20} color="#4ECDC4" />
                        </View>
                        <View style={styles.historyItemInfo}>
                          <Text style={styles.historyItemAmount}>{formatCurrency(abono.monto)}</Text>
                          <Text style={styles.historyItemDate}>{abono.fecha}</Text>
                        </View>
                        <View style={styles.historyItemBadge}>
                          <Text style={styles.historyItemBadgeText}>#{editedOrder.historialAbonos.length - index}</Text>
                        </View>
                      </View>
                      <Text style={styles.historyItemDetail}>
                        Total anterior: {formatCurrency(abono.totalAnterior)}
                      </Text>
                    </View>
                  ))
              ) : (
                <View style={styles.emptyHistory}>
                  <Ionicons name="wallet-outline" size={60} color="#FFB6C1" />
                  <Text style={styles.emptyHistoryText}>No hay abonos registrados</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para cambiar estado */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Estado</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FF1493" />
              </TouchableOpacity>
            </View>

            <View style={styles.statusOptions}>
              {statusOptions.map((status) => (
                <TouchableOpacity
                  key={status.key}
                  style={[
                    styles.statusOption,
                    { backgroundColor: status.bgColor },
                    editedOrder.status === status.key && styles.selectedStatusOption,
                  ]}
                  onPress={() => {
                    updateField("status", status.key)
                    setShowStatusModal(false)
                  }}
                >
                  <Ionicons name={status.icon} size={24} color={status.color} />
                  <Text style={[styles.statusOptionText, { color: status.color }]}>{status.label}</Text>
                  {editedOrder.status === status.key && (
                    <Ionicons name="checkmark-circle" size={20} color={status.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* DatePicker */}
      {showDatePicker && (
        <DateTimePicker
          mode="date"
          display="default"
          value={editedOrder.fechaEntrega ? new Date(editedOrder.fechaEntrega) : new Date()}
          onChange={onDateChange}
        />
      )}

      {/* TimePicker */}
      {showTimePicker && (
        <DateTimePicker
          mode="time"
          display="default"
          value={editedOrder.horaEntrega ? new Date(`2000-01-01T${editedOrder.horaEntrega}:00`) : new Date()}
          onChange={onTimeChange}
        />
      )}
    </View>
  )
}

export { OrderView }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF0F5",
  },
  header: {
    backgroundColor: "#FF1493",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  changesIndicator: {
    backgroundColor: "#FF8E53",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, // Espacio para botones fijos
  },
  imageSection: {
    alignItems: "center",
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF1493",
    marginBottom: 15,
    alignSelf: "flex-start",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#FF1493",
    gap: 4,
  },
  historyButtonText: {
    color: "#FF1493",
    fontSize: 12,
    fontWeight: "600",
  },
  imageContainer: {
    position: "relative",
    marginBottom: 15,
  },
  orderImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: "#FF69B4",
    shadowColor: "#FF69B4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  expandIcon: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  changeImageButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#FF1493",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadgeChanged: {
    borderWidth: 2,
    borderColor: "#FF8E53",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  changesText: {
    fontSize: 14,
    color: "#FF8E53",
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  section: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#FF69B4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  editableCard: {
    gap: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  halfInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  rowContainer: {
    flexDirection: "row",
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF1493",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F5",
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#FFB6C1",
    paddingHorizontal: 15,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#2C3E50",
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F5",
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#FFB6C1",
    paddingHorizontal: 15,
  },
  pickerIcon: {
    marginRight: 10,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  costCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE4E1",
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  costText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF1493",
  },
  // Estilos para el resumen de abonos
  summaryCard: {
    backgroundColor: "#E6F7FF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#45B7D1",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#45B7D1",
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 16,
    color: "#45B7D1",
    fontWeight: "bold",
  },
  totalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF69B4",
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  textAreaWrapper: {
    flexDirection: "row",
    backgroundColor: "#FFF0F5",
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#FFB6C1",
    padding: 15,
    alignItems: "flex-start",
  },
  textAreaIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    color: "#2C3E50",
    textAlignVertical: "top",
    minHeight: 80,
  },
  bottomSpacing: {
    height: 30,
  },
  bottomButtons: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: "row",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  selectStatusButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: "#FFF0F5",
    borderWidth: 2,
    borderColor: "#FF1493",
    gap: 8,
  },
  selectStatusText: {
    color: "#FF1493",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: "#FF1493",
    gap: 8,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: "#FFB6C1",
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F5",
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF69B4",
    marginTop: 20,
    marginBottom: 30,
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#FF1493",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Estilos para el modal de imagen ampliada
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "90%",
    height: "80%",
  },
  enlargedImage: {
    width: "100%",
    height: "90%",
    borderRadius: 20,
  },
  imageModalText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 25,
    borderBottomWidth: 1,
    borderBottomColor: "#FFB6C1",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF1493",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
  },
  statusOptions: {
    padding: 20,
    gap: 15,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 15,
    gap: 15,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedStatusOption: {
    borderColor: "#FF1493",
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statusOptionText: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  paidCard: {
    backgroundColor: "#4ECDC4",
  },
  paidText: {
    color: "white",
  },
  // Estilos para el modal de historial de abonos
  historyScrollView: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  historyItem: {
    backgroundColor: "#FFF0F5",
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#4ECDC4",
  },
  historyItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  historyItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E6FFFA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4ECDC4",
  },
  historyItemDate: {
    fontSize: 12,
    color: "#7F8C8D",
    marginTop: 2,
  },
  historyItemBadge: {
    backgroundColor: "#FF1493",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  historyItemBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  historyItemDetail: {
    fontSize: 14,
    color: "#7F8C8D",
    fontStyle: "italic",
  },
  emptyHistory: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: "#FFB6C1",
    marginTop: 15,
    textAlign: "center",
  },
})
