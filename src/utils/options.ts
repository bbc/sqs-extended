export function extendOptionsIfDefined(options: any) {
  const newOptions: any = {};
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      newOptions[key] = value;
    }
  }
  return newOptions;
}
