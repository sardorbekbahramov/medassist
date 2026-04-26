import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation, Loader2 } from 'lucide-react'
import { api, NearbyPlace } from '@/lib/api'

interface MapViewProps {
  isDark: boolean
}

export function MapView({ isDark }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [places, setPlaces] = useState<NearbyPlace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLon, setUserLon] = useState<number | null>(null)
  const [selected, setSelected] = useState<NearbyPlace | null>(null)

  const EMOJI_MAP: Record<string, string> = {
    pharmacy: '💊',
    hospital: '🏥',
    clinic: '🏥',
    doctors: '👨‍⚕️',
  }

  const initMap = async (lat: number, lon: number, nearby: NearbyPlace[]) => {
    if (typeof window === 'undefined') return
    const L = await import('leaflet')

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
    }

    const map = L.map(mapRef.current!, {
      center: [lat, lon],
      zoom: 15,
      zoomControl: true,
    })

    L.tileLayer(
      isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }
    ).addTo(map)

    // User marker
    const userIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      className: '',
    })
    L.marker([lat, lon], { icon: userIcon }).addTo(map).bindPopup('You are here')

    // Place markers
    nearby.forEach((place) => {
      const color = place.amenity === 'pharmacy' ? '#7c3aed' : '#dc2626'
      const icon = L.divIcon({
        html: `<div style="background:${color};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${EMOJI_MAP[place.amenity] ?? '🏥'}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        className: '',
      })
      L.marker([place.lat, place.lon], { icon })
        .addTo(map)
        .bindPopup(
          `<b>${place.name}</b><br/>${place.distance_m < 1000 ? place.distance_m + 'm' : (place.distance_m / 1000).toFixed(1) + 'km'} away${place.phone ? `<br/>📞 ${place.phone}` : ''}`
        )
    })

    mapInstanceRef.current = map
  }

  const findNearby = () => {
    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setUserLat(lat)
        setUserLon(lon)
        try {
          const nearby = await api.getNearby(lat, lon)
          setPlaces(nearby)
          await initMap(lat, lon, nearby)
        } catch {
          setError('Could not load nearby places.')
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError('Location permission denied.')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => {
    return () => {
      mapInstanceRef.current?.remove()
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--tg-text)' }}>
          Nearby Medical
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tg-hint)' }}>
          Pharmacies & hospitals near you
        </p>
      </div>

      {!userLat && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--tg-secondary-bg)' }}>
            <MapPin size={32} style={{ color: 'var(--tg-link)' }} />
          </div>
          <div className="text-center">
            <p className="font-medium" style={{ color: 'var(--tg-text)' }}>Find nearby places</p>
            <p className="text-sm mt-1" style={{ color: 'var(--tg-hint)' }}>
              We'll show pharmacies and hospitals within 2 km
            </p>
          </div>
          <button
            onClick={findNearby}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-medium text-sm transition-opacity active:opacity-70 disabled:opacity-50"
            style={{ background: 'var(--tg-button)', color: 'var(--tg-button-text)' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
            {loading ? 'Searching...' : 'Use my location'}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      {userLat && (
        <>
          <div ref={mapRef} className="mx-4 rounded-2xl overflow-hidden" style={{ height: 260 }} />

          <div className="flex-1 overflow-y-auto mt-3 px-4 space-y-2 pb-4">
            {places.length === 0 && (
              <p className="text-center text-sm py-4" style={{ color: 'var(--tg-hint)' }}>
                No facilities found within 2 km.
              </p>
            )}
            {places.map((place, i) => (
              <div
                key={i}
                className="rounded-xl p-3 flex items-start gap-3 cursor-pointer"
                style={{
                  background: selected === place
                    ? (isDark ? '#1e3a5f' : '#e0f2fe')
                    : 'var(--tg-secondary-bg)',
                }}
                onClick={() => setSelected(place === selected ? null : place)}
              >
                <span className="text-xl">{EMOJI_MAP[place.amenity] ?? '🏥'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--tg-text)' }}>
                    {place.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tg-hint)' }}>
                    {place.amenity} · {place.distance_m < 1000
                      ? `${place.distance_m}m`
                      : `${(place.distance_m / 1000).toFixed(1)}km`} away
                  </p>
                  {selected === place && (
                    <div className="mt-2 space-y-1">
                      {place.phone && (
                        <p className="text-xs" style={{ color: 'var(--tg-link)' }}>
                          📞 {place.phone}
                        </p>
                      )}
                      {place.opening_hours && (
                        <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
                          🕐 {place.opening_hours}
                        </p>
                      )}
                      {place.address && (
                        <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
                          📍 {place.address}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
