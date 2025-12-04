function getMapHtml(
  pins = [],
  loc = { latitude: 0, longitude: 0 },
  route = []
) {
  const pinsJson = JSON.stringify(pins);
  const routeJson = JSON.stringify(route);
  const centerLat = loc.latitude || 0;
  const centerLng = loc.longitude || 0;
  return `<!doctype html>
      <html><head>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"/>
        <style>
          html,body,#map{height:100%;margin:0;padding:0;}
         .leaflet-control-zoom { display: none !important; }
         .leaflet-control-attribution { font-size: 11px !important; opacity: 0.8; }
          .custom-pin { background: transparent; }
          .pin {
            display:flex; align-items:center; justify-content:center;
            width:36px; height:36px; border-radius:18px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.6);
            color: #fff;
            border: 2px solid rgba(255,255,255,0.3);
          }
          .pin i { font-size:18px; line-height:18px; }
          .pin-mode-hint {
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.6);
            color: #fff;
            padding: 6px 10px;
            border-radius: 12px;
            font-size: 12px;
            z-index: 9999;
            display: none;
          }
          .pin-mode-hint.show { display: block; }
        </style>
      </head><body>
        <div id="map" style="touch-action: none;"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          const pins = ${pinsJson};
          const route = ${routeJson};
          const map = L.map('map', { attributionControl: false, zoomControl: false }).setView([${centerLat}, ${centerLng}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          let _pinMode = false;
          const pinHintEl = document.getElementById('pinHint');

          const markers = {};
          function addPins(list){
            Object.values(markers).forEach(m=>map.removeLayer(m));
            for(const p of list){
              const isCurrent = p.id === "__current_location";

       const iconHtml =
        '<div class="pin" style="' +
          (isCurrent
            ? 'background:transparent !important;' +
              'border:none !important;' +
              'outline:none !important;' +
              'box-shadow:none !important;' +
              'padding:0;'
            : 'background:' + (p.color || '#2c352a') + ';' +
              (p.size
                ? 'width:' + p.size + 'px;height:' + p.size + 'px;border-radius:' + (p.size / 2) +
                  'px;box-shadow:0 2px 8px rgba(25,118,210,0.4);border:3px solid #fff;'
                : ''
              ) +
              (p.isEvacuation ? 'outline:1px solid ;' : '') +
              (p.isMedical ? 'outline:1px solid ;' : '')
          ) +
        '">' +
          '<i class="' + (p.iconClass || 'fas fa-map-marker-alt') + '" ' +
            'style="font-size:' + (isCurrent ? 36 : (p.size ? Math.floor(p.size / 2) : 18)) + 'px;' +
            (isCurrent ? 'color:red !important;' : '') +
          '"></i>' +
        '</div>';


              const pinSize = p.size ? p.size : 36;
              const myIcon = L.divIcon({
                html: iconHtml,
                className: 'custom-pin',
                iconSize: [pinSize, pinSize],
                iconAnchor: [pinSize / 2, pinSize],
              });
              const m = L.marker([p.latitude, p.longitude], { icon: myIcon }).addTo(map);
              m.on('click', ()=> window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerClick', id: p.id})));
              markers[p.id] = m;
            }
          }

          function drawRoute(r){
            if(window._route) map.removeLayer(window._route);
            if(r && r.length){
              const latlngs = r.map(c=>[c.latitude, c.longitude]);
              window._route = L.polyline(latlngs, {color:'#EC6135', weight:6}).addTo(map);
              map.fitBounds(window._route.getBounds(), {padding:[40,40]});
            }
          }

          addPins(pins);
          drawRoute(route);

          // Track map center changes
          map.on('moveend', function(e) {
            const center = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapCenterChanged',
              latitude: center.lat,
              longitude: center.lng
            }));
          });

          // Send initial center
          const initialCenter = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapCenterChanged',
            latitude: initialCenter.lat,
            longitude: initialCenter.lng
          }));

          (function() {
            let timer = null;
            let startPoint = null;
            const threshold = 600;
            let longPressed = false;

            function getLatLngFromEvent(e){
              try {
                if (!e) return null;
                if(e.latlng) return e.latlng;
                const raw = e && e.originalEvent ? e.originalEvent : e;
                if(raw) return map.mouseEventToLatLng(raw);
              } catch(err){}
              return null;
            }

            function onDown(e){
              longPressed = false;
              startPoint = getLatLngFromEvent(e) || null;
              if(timer){ clearTimeout(timer); timer = null; }
              timer = setTimeout(() => {
                if(startPoint && _pinMode){
                  longPressed = true;
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapLongPress',
                    latitude: startPoint.lat,
                    longitude: startPoint.lng
                  }));
                }
              }, threshold);
            }

            function onUp(e){
              if(timer){
                clearTimeout(timer);
                timer = null;
              }
              if(!_pinMode){
                longPressed = false;
                return;
              }
              if(longPressed){
                longPressed = false;
                return;
              }
              const pt = getLatLngFromEvent(e) || null;
              if(pt){
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'mapPin',
                  latitude: pt.lat,
                  longitude: pt.lng
                }));
              }
            }

            const container = map.getContainer();
            container.addEventListener('pointerdown', onDown);
            container.addEventListener('pointerup', onUp);
            container.addEventListener('touchstart', onDown);
            container.addEventListener('touchend', onUp);
            container.addEventListener('touchcancel', onUp);
            container.addEventListener('mousedown', onDown);
            container.addEventListener('mouseup', onUp);

            map.on('click', function(e){
              window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapClick', latitude: e.latlng.lat, longitude: e.latlng.lng}));
            });
          })();

          function handleMessage(m){
            try{
              const msg = typeof m.data === 'string' ? JSON.parse(m.data) : m.data;
              if(msg?.type === 'updatePins') addPins(msg.pins||[]);
              if(msg?.type === 'updateRoute') drawRoute(msg.route||[]);
              if(msg?.type === 'flyTo') map.setView([msg.latitude, msg.longitude], msg.zoom||15);
              if(msg?.type === 'setPinMode'){
                _pinMode = !!msg.enabled;
                if(_pinMode) pinHintEl.classList.add('show'); else pinHintEl.classList.remove('show');
              }
              if(msg?.type === 'getCenter'){
                const center = map.getCenter();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'mapCenterResponse',
                  latitude: center.lat,
                  longitude: center.lng
                }));
              }
              // 👉 NEW: Handle live location updates
              if(msg?.type === 'updateUserLocation'){
                const currentMarker = markers['__current_location'];
                if(currentMarker){
                  // Update existing marker position smoothly
                  currentMarker.setLatLng([msg.latitude, msg.longitude]);
                } else {
                  // Create new marker if it doesn't exist
                  const iconHtml = '<div class="pin" style="background:transparent !important;border:none !important;outline:none !important;box-shadow:none !important;padding:0;">' +
                    '<i class="fas fa-map-marker-alt" style="font-size:36px;color:red !important;"></i>' +
                    '</div>';
                  const myIcon = L.divIcon({
                    html: iconHtml,
                    className: 'custom-pin',
                    iconSize: [36, 36],
                    iconAnchor: [18, 36],
                  });
                  const newMarker = L.marker([msg.latitude, msg.longitude], { icon: myIcon }).addTo(map);
                  newMarker.on('click', ()=> window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerClick', id: '__current_location'})));
                  markers['__current_location'] = newMarker;
                }
              }
              // 👉 NEW: Handle crosshair mode
              if(msg?.type === 'setCrosshairMode'){
                // You can add visual crosshair overlay here if needed
                // For now, just track the state
                window._crosshairMode = !!msg.enabled;
              }
            }catch(e){}
          }
          document.addEventListener('message', handleMessage);
          window.addEventListener('message', handleMessage);
        </script>
      </body></html>`;
}

export default getMapHtml;