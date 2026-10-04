export function normalizeCountData(data) {
  return data.map((point) => ({
    ...point,
    y: Math.round(Number(point.y) || 0),
  }))
}

export function getIntegerAxisInterval(data) {
  const maximum = data.reduce((value, point) => Math.max(value, point.y), 0)
  return Math.max(1, Math.ceil(maximum / 5))
}