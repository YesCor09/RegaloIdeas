"use client"

import {
  Alert,
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  SafeAreaView,
  ScrollView,
  Pressable,
  Platform,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from "react-native"
import { useEffect, useState } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import DateTimePicker from "@react-native-community/datetimepicker"
import { format } from "date-fns"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Picker } from "@react-native-picker/picker"
import { Ionicons } from "@expo/vector-icons"
import { PreciosEnvios, findPrecioByUbicacion } from "../config/envios.config.js"
import { pickImageWithPermanentStorage } from "../components/ImageUtils.js"

const { width } = Dimensions.get("window")

const NewOrder = () => {
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [flowerColor, setFlowerColor] = useState("")
  const [flowerQuantity, setFlowerQuantity] = useState("")
  const [specialPhrase, setSpecialPhrase] = useState("")
  const [totalCost, setTotalCost] = useState("")
  const [downPayment, setDownPayment] = useState("")
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [deliveryDate, setDeliveryDate] = useState(new Date())
  const [deliveryLocation, setDeliveryLocation] = useState("")
  const [shippingCost, setShippingCost] = useState("")
  const [additionalComments, setAdditionalComments] = useState("")
  const [selectedImage, setSelectedImage] = useState(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [horaEntrega, setHoraEntrega] = useState("")
  const [referencias, setReferencias] = useState("")
  const [imageLoading, setImageLoading] = useState(false) // Estado para loading
  const status = "En proceso"
  const [orders, setOrders] = useState([])
  const insets = useSafeAreaInsets() // Hook para obtener las áreas seguras

  const pickImage = async () => {
    try {
      setImageLoading(true)
      const permanentImageUri = await pickImageWithPermanentStorage()

      if (permanentImageUri) {
        setSelectedImage(permanentImageUri)
        console.log("Imagen guardada en:", permanentImageUri)
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error)
      Alert.alert("Error", "No se pudo seleccionar la imagen")
    } finally {
      setImageLoading(false)
    }
  }

  const calculateRemainingAmount = () => {
    const total = Number.parseFloat(totalCost) || 0
    const down = Number.parseFloat(downPayment) || 0
    const envio = Number.parseFloat(shippingCost) || 0
    setRemainingAmount((total - down + envio).toFixed(2))
  }

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setDeliveryDate(selectedDate)
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
        setHoraEntrega(`${hours}:${minutes}`)
      }
    } else {
      setShowTimePicker(false)
    }
  }

  const addOrder = async () => {
    if (!deliveryDate || isNaN(deliveryDate.getTime())) {
      Alert.alert("Error", "La fecha de entrega no es válida.")
      return
    }

    const formattedDate2 = format(deliveryDate, "yyyy-MM-dd")

    const newOrder = {
      id: Date.now(),
      name: customerName,
      telefono: customerPhone,
      color: flowerColor,
      frase: specialPhrase,
      cantidad: flowerQuantity,
      costoTotal: totalCost,
      abono: downPayment,
      cantidadRestante: remainingAmount,
      fechaEntrega: formattedDate2,
      horaEntrega, // Agregar la hora de entrega
      comentario: additionalComments,
      image: selectedImage, // Esta ahora será una URI permanente
      status,
      ubicacionEnvio: deliveryLocation,
      referencias: referencias,
      costoEnvio: shippingCost,
      // Agregar historial de abonos si hay abono inicial
      historialAbonos:
        downPayment > 0
          ? [
              {
                id: Date.now().toString(),
                monto: Number.parseFloat(downPayment).toFixed(2),
                fecha: new Date().toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                totalAnterior: "0.00",
              },
            ]
          : [],
    }

    try {
      const existingOrders = await AsyncStorage.getItem("orders")
      const updateOrders = existingOrders ? JSON.parse(existingOrders) : []
      updateOrders.push(newOrder)

      await AsyncStorage.setItem("orders", JSON.stringify(updateOrders))
      setOrders(updateOrders)
      Alert.alert("¡Éxito! 🌹", "El pedido se guardó correctamente")
      clearForm()
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el pedido.")
      console.error(error)
    }
  }

  const clearForm = () => {
    setCustomerName("")
    setCustomerPhone("")
    setFlowerColor("")
    setSpecialPhrase("")
    setFlowerQuantity("")
    setTotalCost("")
    setDownPayment("")
    setRemainingAmount(0)
    setDeliveryDate(new Date())
    setDeliveryLocation("")
    setShippingCost("")
    setAdditionalComments("")
    setSelectedImage(null)
    setHoraEntrega("")
    setReferencias("")
  }

  useEffect(() => {
    calculateRemainingAmount()
  }, [totalCost, downPayment, shippingCost])

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#FF1493" />

      {/* Header con gradiente */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuevo Pedido</Text>
          <View style={styles.headerIcon}>
            <Ionicons name="rose" size={24} color="white" />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Sección de imagen */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Foto del Arreglo</Text>

          {selectedImage ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.selectedImage}
                onError={(error) => {
                  console.log("Error loading image:", error)
                  Alert.alert("Error", "No se pudo cargar la imagen")
                }}
              />
              <TouchableOpacity style={styles.changeImageButton} onPress={pickImage} disabled={imageLoading}>
                {imageLoading ? (
                  <Ionicons name="hourglass" size={20} color="white" />
                ) : (
                  <Ionicons name="camera" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage} disabled={imageLoading}>
              {imageLoading ? (
                <>
                  <Ionicons name="hourglass-outline" size={40} color="#FF69B4" />
                  <Text style={styles.imagePlaceholderText}>Guardando imagen...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={40} color="#FF69B4" />
                  <Text style={styles.imagePlaceholderText}>Toca para añadir foto</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Información del cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="person" size={20} color="#FF1493" /> Información del Cliente
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nombre del cliente</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                onChangeText={setCustomerName}
                value={customerName}
                placeholder="Nombre completo"
                placeholderTextColor="#FFB6C1"
              />
            </View>
          </View>

          <View style={styles.rowContainer}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Teléfono</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  onChangeText={setCustomerPhone}
                  value={customerPhone}
                  placeholder="Teléfono"
                  keyboardType="phone-pad"
                  placeholderTextColor="#FFB6C1"
                />
              </View>
            </View>

            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Color de rosas</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="color-palette-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  onChangeText={setFlowerColor}
                  value={flowerColor}
                  placeholder="Color"
                  placeholderTextColor="#FFB6C1"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Detalles del pedido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="rose" size={20} color="#FF1493" /> Detalles del Pedido
          </Text>

          <View style={styles.rowContainer}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Frase</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="chatbubble-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  onChangeText={setSpecialPhrase}
                  value={specialPhrase}
                  placeholder="Frase especial"
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
                  onChangeText={setFlowerQuantity}
                  value={flowerQuantity}
                  placeholder="# rosas"
                  keyboardType="numeric"
                  placeholderTextColor="#FFB6C1"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Información financiera */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="card" size={20} color="#FF1493" /> Información Financiera
          </Text>

          <View style={styles.rowContainer}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Costo del Arreglo</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="cash-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  onChangeText={setTotalCost}
                  value={totalCost}
                  placeholder="$0.00"
                  keyboardType="numeric"
                  placeholderTextColor="#FFB6C1"
                />
              </View>
            </View>

            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Abono</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="wallet-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  onChangeText={setDownPayment}
                  value={downPayment}
                  placeholder="$0.00"
                  keyboardType="numeric"
                  placeholderTextColor="#FFB6C1"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Ubicación y envío */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="location" size={20} color="#FF1493" /> Ubicación de Entrega
          </Text>

          <View style={styles.pickerContainer}>
            <Ionicons name="map-outline" size={20} color="#FF69B4" style={styles.pickerIcon} />
            <Picker
              style={styles.picker}
              selectedValue={deliveryLocation}
              onValueChange={(itemValue, itemIndex) => {
                setDeliveryLocation(itemValue)
                const precioInfo = findPrecioByUbicacion(itemValue)
                if (precioInfo) {
                  setShippingCost(precioInfo.precio)
                }
              }}
            >
              <Picker.Item label="Selecciona ubicación" value="" />
              {Object.values(PreciosEnvios).map((item, index) => (
                <Picker.Item key={index} label={item.ubicacion} value={item.ubicacion} />
              ))}
            </Picker>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Referencias de ubicación</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="document-text-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                onChangeText={setReferencias}
                value={referencias}
                placeholder="Casa blanca, portón azul, etc..."
                placeholderTextColor="#FFB6C1"
                multiline={true}
                numberOfLines={2}
              />
            </View>
          </View>

          {shippingCost && (
            <View style={styles.costCard}>
              <Ionicons name="car-outline" size={20} color="#FF1493" />
              <Text style={styles.costText}>Costo de envío: ${shippingCost}</Text>
            </View>
          )}

          {remainingAmount && (
            <View style={styles.totalCard}>
              <Ionicons name="calculator-outline" size={20} color="#FF1493" />
              <Text style={styles.totalText}>Total restante: ${remainingAmount}</Text>
            </View>
          )}
        </View>

        {/* Fecha y hora de entrega */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="calendar" size={20} color="#FF1493" /> Fecha y Hora de Entrega
          </Text>

          {/* Fecha de entrega */}
          {showDatePicker && (
            <DateTimePicker mode="date" display="spinner" value={deliveryDate} onChange={onDateChange} />
          )}

          {!showDatePicker && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Fecha de entrega</Text>
              <Pressable onPress={() => setShowDatePicker(true)}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={deliveryDate.toLocaleDateString()}
                    placeholder="Selecciona fecha"
                    editable={false}
                    placeholderTextColor="#FFB6C1"
                  />
                </View>
              </Pressable>
            </View>
          )}

          {/* Hora de entrega */}
          {showTimePicker && (
            <DateTimePicker
              mode="time"
              display="spinner"
              value={horaEntrega ? new Date(`2000-01-01T${horaEntrega}:00`) : new Date()}
              onChange={onTimeChange}
            />
          )}

          {!showTimePicker && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Hora de entrega</Text>
              <Pressable onPress={() => setShowTimePicker(true)}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="time-outline" size={20} color="#FF69B4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={horaEntrega || ""}
                    placeholder="Selecciona hora"
                    editable={false}
                    placeholderTextColor="#FFB6C1"
                  />
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {/* Comentarios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="chatbubbles" size={20} color="#FF1493" /> Comentarios Adicionales
          </Text>

          <View style={styles.textAreaWrapper}>
            <Ionicons name="document-text-outline" size={20} color="#FF69B4" style={styles.textAreaIcon} />
            <TextInput
              onChangeText={setAdditionalComments}
              value={additionalComments}
              multiline={true}
              numberOfLines={4}
              placeholder="Notas especiales, instrucciones adicionales..."
              placeholderTextColor="#FFB6C1"
              style={styles.textArea}
            />
          </View>
        </View>

        {/* Botón de guardar */}
        <TouchableOpacity style={styles.saveButton} onPress={addOrder}>
          <View style={styles.saveButtonContent}>
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text style={styles.saveButtonText}>Guardar Pedido</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </View>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  )
}

export { NewOrder }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF0F5",
  },
  header: {
    backgroundColor: "#FF1493",
    paddingTop: 10,
    paddingBottom: 20,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30, // Reducir padding ya que usamos insets
  },
  imageSection: {
    alignItems: "center",
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF1493",
    marginBottom: 15,
    alignSelf: "flex-start",
  },
  imageContainer: {
    position: "relative",
  },
  selectedImage: {
    width: 200,
    height: 200,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#FF69B4",
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
  imagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FF69B4",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 105, 180, 0.1)",
  },
  imagePlaceholderText: {
    color: "#FF69B4",
    fontSize: 16,
    marginTop: 10,
    fontWeight: "600",
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
    marginBottom: 15,
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
    marginBottom: 10,
    gap: 10,
  },
  costText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF1493",
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
  saveButton: {
    backgroundColor: "#FF1493",
    borderRadius: 25,
    marginTop: 20,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 30,
    gap: 12,
  },
  saveButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  bottomSpacing: {
    height: 30,
  },
})
