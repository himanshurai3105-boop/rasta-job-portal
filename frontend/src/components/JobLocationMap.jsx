import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Vite/bundler mein Leaflet ke default pin ki images tootti hain, isliye yahan theek karte hain
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Candidate ki location ka neela gola
const youIcon = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px #2563eb88"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const FitToPoints = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    else if (points.length === 1) map.setView(points[0], 13);
  }, [map, points]);
  return null;
};

const JobLocationMap = ({ jobCoords, jobTitle, userCoords, height = 260 }) => {
  const points = useMemo(() => {
    const list = [[jobCoords.lat, jobCoords.lng]];
    if (userCoords) list.push([userCoords.lat, userCoords.lng]);
    return list;
  }, [jobCoords.lat, jobCoords.lng, userCoords?.lat, userCoords?.lng]);

  return (
    <div
      className="relative z-0 overflow-hidden rounded-xl border border-ink/10"
      style={{ isolation: "isolate" }}
    >
      <MapContainer
        center={[jobCoords.lat, jobCoords.lng]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[jobCoords.lat, jobCoords.lng]}>
          <Popup>{jobTitle || "Job location"}</Popup>
        </Marker>
        {userCoords && (
          <Marker position={[userCoords.lat, userCoords.lng]} icon={youIcon}>
            <Popup>Your location</Popup>
          </Marker>
        )}
        <FitToPoints points={points} />
      </MapContainer>
    </div>
  );
};

export default JobLocationMap;