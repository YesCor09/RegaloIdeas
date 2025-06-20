export const PreciosEnvios = {
  Recoje_En_Tienda: {
    precio: 0,
    ubicacion: "Recoje En Tienda",
  },
  Huejutla: {
    precio: 0,
    ubicacion: "Huejutla",
  },
  Chililico: {
    precio: 50,
    ubicacion: "Chililico",
  },
  Macuxtepetla: {
    precio: 50,
    ubicacion: "Macuxtepetla",
  },
  Tehuetlan: {
    precio: 80,
    ubicacion: "Tehuetlan",
  },
  Tlanchinol: {
    precio: 150,
    ubicacion: "Tlanchinol",
  },
  Tlanchinol_Combi: {
    precio: 0,
    ubicacion: "Tlanchinol (Combi)",
  },
  Ixcatlan: {
    precio: 120,
    ubicacion: "Ixcatlán",
  },
  El_Pintor: {
    precio: 50,
    ubicacion: "El Pintor",
  },
  Chalma: {
    precio: 80,
    ubicacion: "Chalma",
  },
  Chalma_Taxi: {
    precio: 20,
    ubicacion: "Chalma (Taxi)",
  },
  Platon_Centro: {
    precio: 150,
    ubicacion: "Platón Centro",
  },
  Platon_Taxi: {
    precio: 20,
    ubicacion: "Platón (Taxi)",
  },
  Tantoyuca_Personalmente: {
    precio: 180,
    ubicacion: "Tantoyuca (Personalmente)",
  },
  Tantoyuca_Taxi: {
    precio: 20,
    ubicacion: "Tantoyuca (Taxi)",
  },
  Jaltocan: {
    precio: 80,
    ubicacion: "Jaltocán",
  },
  San_Felipe: {
    precio: 120,
    ubicacion: "San Felipe",
  },
  San_Felipe_Combi: {
    precio: 0,
    ubicacion: "San Felipe (Combi)",
  },
  Atlapexco: {
    precio: 80,
    ubicacion: "Atlapexco",
  },
  Atlapexco_Combi: {
    precio: 0,
    ubicacion: "Atlapexco (Combi)",
  },
  Huautla_Centro: {
    precio: 130,
    ubicacion: "Huautla Centro",
  },
  Huautla_Combi: {
    precio: 0,
    ubicacion: "Huautla (Combi)",
  },
  Yahualica: {
    precio: 150,
    ubicacion: "Yahualica",
  },
  Yahualica_Combi: {
    precio: 0,
    ubicacion: "Yahualica (Combi)",
  },
  Mecatlan: {
    precio: 150,
    ubicacion: "Mecatlán",
  },
  Mecatlan_Combi: {
    precio: 0,
    ubicacion: "Mecatlán (Combi)",
  },
  Papatlatla: {
    precio: 200,
    ubicacion: "Papatlatla",
  },
  Papatlatla_Combi: {
    precio: 0,
    ubicacion: "Papatlatla (Combi)",
  },
  Zoquitipan: {
    precio: 180,
    ubicacion: "Zoquitipan",
  },
  Zoquitipan_Combi: {
    precio: 0,
    ubicacion: "Zoquitipan (Combi)",
  },
  El_Arenal: {
    precio: 180,
    ubicacion: "El Arenal",
  },
}

// Función helper para buscar por ubicación
export const findPrecioByUbicacion = (ubicacionBuscada) => {
  const entry = Object.entries(PreciosEnvios).find(([key, value]) => value.ubicacion === ubicacionBuscada)
  return entry ? entry[1] : null
}

// Función helper para obtener todas las ubicaciones
export const getAllUbicaciones = () => {
  return Object.values(PreciosEnvios).map((item) => item.ubicacion)
}
