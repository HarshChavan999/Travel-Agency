export function parseFirestoreValue(value: any): any {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return parseFloat(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ('mapValue' in value) {
    const res: any = {};
    const fields = value.mapValue.fields || {};
    for (const key in fields) {
      res[key] = parseFirestoreValue(fields[key]);
    }
    return res;
  }
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  return value;
}

export function parseFirestoreDocument(doc: any) {
  if (!doc || !doc.fields) return null;
  const res: any = {};
  for (const key in doc.fields) {
    res[key] = parseFirestoreValue(doc.fields[key]);
  }
  if (doc.name) {
    res.id = doc.name.split('/').pop();
  }
  return res;
}
