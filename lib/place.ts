export const normalizePlace = (value:string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/ß/g,"ss").replace(/straße|strasse|str\./g,"str").replace(/[^a-z0-9]/g,"");

export function matchesStore(location:string|null, address:string) {
  const key=normalizePlace(address);
  return !!key && (location||"").split("; ").some(label=>normalizePlace(label).includes(key));
}
