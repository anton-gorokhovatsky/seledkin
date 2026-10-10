// Preserve Mapbox geography; only the presentation and Russian label choice change.
export function styleStoreMap(source, colors) {
  const style = structuredClone(source);
  const text = ["coalesce", ["get", "name_ru"], ["get", "name"]];
  for (const layer of style.layers) {
    layer.paint ??= {};
    layer.layout ??= {};
    if (layer.type === "background") layer.paint["background-color"] = colors.land;
    if (layer.type === "fill") {
      const color = layer.id === "building" ? colors.building
        : layer.id === "water" ? colors.water
          : /landuse|national-park/.test(layer.id) ? colors.park : colors.land;
      layer.paint["fill-color"] = color;
      if (layer.id === "building") layer.paint["fill-outline-color"] = colors.land;
    }
    if (layer.type === "symbol" && layer.layout["text-field"]) {
      layer.layout["text-field"] = text;
      layer.paint["text-color"] = colors.label;
      layer.paint["text-halo-color"] = colors.land;
    }
    // Metro and rail stations help people orient; other POIs add noise here.
    if (layer.id === "poi-label") {
      layer.filter = ["match", ["get", "maki"], ["rail-metro", "rail", "rail-light"], true, false];
      layer.layout["text-size"] = 13;
    }
  }
  return style;
}
