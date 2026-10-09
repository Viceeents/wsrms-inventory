export function dimensionsFit(parcel, location) {
  if (
    ![parcel.length_cm, parcel.width_cm, parcel.height_cm].every(
      (v) => Number(v) > 0,
    )
  )
    return true; // Historical records have no measured dimensions.
  const base = [Number(parcel.length_cm), Number(parcel.width_cm)].sort(
    (a, b) => a - b,
  );
  const space = [Number(location.width_cm), Number(location.depth_cm)].sort(
    (a, b) => a - b,
  );
  return (
    base[0] <= space[0] &&
    base[1] <= space[1] &&
    Number(parcel.height_cm) <= Number(location.height_cm)
  );
}
export function classifyParcel(parcel, limits) {
  if (
    ![parcel.length_cm, parcel.width_cm, parcel.height_cm].every(
      (v) => Number(v) > 0,
    )
  )
    return parcel.size;
  const d = [parcel.length_cm, parcel.width_cm, parcel.height_cm]
    .map(Number)
    .sort((a, b) => a - b);
  for (const size of ["Small", "Medium"]) {
    const max = limits[size].slice().sort((a, b) => a - b);
    if (d.every((v, i) => v <= max[i])) return size;
  }
  return "Large";
}
