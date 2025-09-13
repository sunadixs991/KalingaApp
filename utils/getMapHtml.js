export default function getMapHtml(
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
      ... // (rest of your HTML/JS code here)
    </body></html>`;
}