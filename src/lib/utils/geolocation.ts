/**
 * Utilitaires de géolocalisation et géocodage pour CarsLink
 */

// Position par défaut (Paris)
export const DEFAULT_POSITION = {
  latitude: 48.8566,
  longitude: 2.3522,
}

/**
 * Obtient la position de l'utilisateur via l'API Geolocation
 * Retourne null si l'utilisateur refuse la géolocalisation
 */
export function getUserPosition(): Promise<{ latitude: number; longitude: number; source: 'gps' | 'default' } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ...DEFAULT_POSITION, source: 'default' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: 'gps',
        })
      },
      (error) => {
        // Si l'utilisateur refuse la géolocalisation, ne pas utiliser de position par défaut
        // Cela évite d'afficher des garages incorrects basés sur une mauvaise position
        if (error.code === 1) { // PERMISSION_DENIED = 1
          resolve(null)
        } else {
          // Pour les autres erreurs (timeout, etc.), utiliser Paris mais avec un rayon réduit
          resolve({ ...DEFAULT_POSITION, source: 'default' })
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    )
  })
}

/**
 * Calcule la distance en mètres entre deux points (formule de Haversine)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Rayon de la Terre en mètres
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance en mètres
}

/**
 * Formate la distance en texte lisible
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

/**
 * Vérifie si un point est dans un rayon donné (en mètres)
 */
export function isWithinRadius(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusMeters: number
): boolean {
  const distanceMeters = calculateDistance(lat1, lon1, lat2, lon2)
  return distanceMeters <= radiusMeters
}

/**
 * Géocode une adresse en coordonnées GPS via l'API OpenCage
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  postalCode?: string,
  country: string = "France"
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const fullAddress = [address, city, postalCode, country]
      .filter(Boolean)
      .join(", ")

    const response = await fetch("/api/geocode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address: fullAddress }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data.latitude && data.longitude) {
      return {
        latitude: data.latitude,
        longitude: data.longitude,
      }
    }

    return null
  } catch (error) {
    return null
  }
}
