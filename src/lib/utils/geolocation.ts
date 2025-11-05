/**
 * Utilitaires de géolocalisation et géocodage pour CarsLink
 */

// Position par défaut (Paris)
export const DEFAULT_POSITION = {
  latitude: 48.8566,
  longitude: 2.3522,
}

/**
 * Récupère la position de l'utilisateur via le navigateur
 * @returns Promise avec les coordonnées ou la position par défaut
 */
export async function getUserPosition(): Promise<{ latitude: number; longitude: number; source: 'gps' | 'default' }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.log("Geolocation not supported, using default position (Paris)")
      resolve({ ...DEFAULT_POSITION, source: 'default' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        console.log(`User position: ${latitude}, ${longitude} (GPS)`)
        resolve({ latitude, longitude, source: 'gps' })
      },
      (error) => {
        console.log(`Geolocation error: ${error.message}, using default position (Paris)`)
        resolve({ ...DEFAULT_POSITION, source: 'default' })
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 300000, // 5 minutes
      }
    )
  })
}

/**
 * Calcule la distance en km entre deux points (formule de Haversine)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Formate la distance pour l'affichage
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`
  }
  return `${distanceKm.toFixed(1)} km`
}

/**
 * Géocode une adresse via l'API OpenCage
 * La clé API est récupérée depuis la base de données (table carslink_app_settings)
 * via la route API /api/geocode
 */
export async function geocodeAddress(
  address: string,
  city: string | null,
  postalCode: string | null,
  country: string = "France"
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Construire l'adresse complète
    const fullAddress = [address, city, postalCode].filter(Boolean).join(', ')

    if (!fullAddress.trim()) {
      console.warn('No address provided for geocoding')
      return null
    }

    // Appeler la route API qui récupère la clé depuis la DB et géocode
    const response = await fetch('/api/geocode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        city,
        postalCode,
        country,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.warn(`Geocoding API error: ${response.status} - ${errorData.error || 'Unknown error'}`)
      return null
    }

    const data = await response.json()

    if (data.latitude && data.longitude) {
      console.log(`✅ Geocoded "${fullAddress}": ${data.latitude}, ${data.longitude}`)
      return {
        latitude: data.latitude,
        longitude: data.longitude,
      }
    }

    console.warn(`No results found for "${fullAddress}"`)
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Vérifie si une position est dans un rayon donné (en km)
 */
export function isWithinRadius(
  centerLat: number,
  centerLon: number,
  pointLat: number,
  pointLon: number,
  radiusKm: number
): boolean {
  const distance = calculateDistance(centerLat, centerLon, pointLat, pointLon)
  return distance <= radiusKm
}

