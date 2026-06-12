import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Colors from '@/constants/colors';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  subtitle?: string;
  /** hex boja markera, npr. '#0ea5e9' */
  color?: string;
}

interface Props {
  markers: MapMarker[];
  /** Početni centar; ako nije zadan računa se iz markera. */
  center?: { latitude: number; longitude: number };
  zoom?: number;
  style?: any;
  onMarkerPress?: (id: string) => void;
}

const DEFAULT_CENTER = { latitude: 43.8563, longitude: 18.4131 }; // Sarajevo

function buildHtml(markers: MapMarker[], center: { latitude: number; longitude: number }, zoom: number): string {
  const markersJson = JSON.stringify(markers);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .pin {
      width: 18px; height: 18px; border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg); border: 2px solid #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var markers = ${markersJson};
    var map = L.map('map', { zoomControl: true, attributionControl: false })
      .setView([${center.latitude}, ${center.longitude}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    var bounds = [];
    markers.forEach(function (m) {
      if (m.latitude == null || m.longitude == null) return;
      var color = m.color || '#0ea5e9';
      var icon = L.divIcon({
        className: '',
        html: '<div class="pin" style="background:' + color + '"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 18],
      });
      var marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(map);
      if (m.title) {
        marker.bindPopup('<b>' + (m.title || '') + '</b>' + (m.subtitle ? '<br/>' + m.subtitle : ''));
      }
      marker.on('click', function () {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: m.id }));
        }
      });
      bounds.push([m.latitude, m.longitude]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    }
  </script>
</body>
</html>`;
}

export function LeafletMap({ markers, center, zoom = 13, style, onMarkerPress }: Props) {
  const resolvedCenter = useMemo(() => {
    if (center) return center;
    const valid = markers.filter((m) => m.latitude != null && m.longitude != null);
    if (valid.length > 0) {
      const lat = valid.reduce((s, m) => s + m.latitude, 0) / valid.length;
      const lng = valid.reduce((s, m) => s + m.longitude, 0) / valid.length;
      return { latitude: lat, longitude: lng };
    }
    return DEFAULT_CENTER;
  }, [markers, center]);

  const html = useMemo(
    () => buildHtml(markers, resolvedCenter, zoom),
    [markers, resolvedCenter, zoom],
  );

  // Na webu WebView renderira preko iframe srcDoc
  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data?.type === 'markerPress' && onMarkerPress) onMarkerPress(data.id);
          } catch {
            // ignore
          }
        }}
        {...(Platform.OS === 'android' ? { androidLayerType: 'hardware' as const } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: Colors.border },
  webview:   { flex: 1, backgroundColor: 'transparent' },
});
