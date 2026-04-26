import aiohttp
import math
from typing import List, Dict, Any

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
RADIUS_METERS = 2000


def _haversine(lat1, lon1, lat2, lon2) -> float:
    """Return distance in meters between two GPS coordinates."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def find_nearby_medical(lat: float, lon: float) -> List[Dict[str, Any]]:
    """Query Overpass for pharmacies and hospitals within RADIUS_METERS."""
    query = f"""
    [out:json][timeout:10];
    (
      node["amenity"~"pharmacy|hospital|clinic|doctors"](around:{RADIUS_METERS},{lat},{lon});
      way["amenity"~"pharmacy|hospital|clinic|doctors"](around:{RADIUS_METERS},{lat},{lon});
    );
    out center tags;
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                OVERPASS_URL,
                data={"data": query},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json()

        results = []
        for element in data.get("elements", []):
            tags = element.get("tags", {})
            name = tags.get("name") or tags.get("name:en") or "Unknown"
            amenity = tags.get("amenity", "medical")

            # Get coordinates
            if element.get("type") == "node":
                elat, elon = element.get("lat", 0), element.get("lon", 0)
            else:
                center = element.get("center", {})
                elat, elon = center.get("lat", 0), center.get("lon", 0)

            if not elat or not elon:
                continue

            distance = _haversine(lat, lon, elat, elon)
            results.append(
                {
                    "name": name,
                    "amenity": amenity,
                    "lat": elat,
                    "lon": elon,
                    "distance_m": round(distance),
                    "phone": tags.get("phone", ""),
                    "opening_hours": tags.get("opening_hours", ""),
                    "address": tags.get("addr:street", ""),
                }
            )

        results.sort(key=lambda x: x["distance_m"])
        return results[:15]

    except Exception:
        return []
