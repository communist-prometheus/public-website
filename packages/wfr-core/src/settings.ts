/** Primitive values a provider setting may hold. */
export type SettingValue = string | number | boolean;

/** A bag of provider settings keyed by field key. */
export type ProviderSettings = Readonly<Record<string, SettingValue>>;

/** A selectable option for a `select` field. */
export interface SettingOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Declarative description of one configurable setting. The settings panel
 * renders controls purely from these descriptors — no provider UI code needed.
 */
export type SettingField =
  | { readonly kind: 'boolean'; readonly key: string; readonly label: string; readonly default: boolean }
  | {
      readonly kind: 'number';
      readonly key: string;
      readonly label: string;
      readonly default: number;
      readonly min?: number;
      readonly max?: number;
      readonly step?: number;
    }
  | { readonly kind: 'text'; readonly key: string; readonly label: string; readonly default: string }
  | {
      readonly kind: 'select';
      readonly key: string;
      readonly label: string;
      readonly default: string;
      readonly options: readonly SettingOption[];
    };

/** A provider's full settings schema. */
export type SettingsSchema = readonly SettingField[];

/** Build the default settings object from a schema. */
export const defaultsFromSchema = (schema: SettingsSchema): ProviderSettings =>
  Object.freeze(
    Object.fromEntries(schema.map((field) => [field.key, field.default] as const)),
  );

/** Serialize settings to a stable JSON string for host-side persistence. */
export const serializeSettings = (settings: ProviderSettings): string =>
  JSON.stringify(settings);

/**
 * Parse persisted settings, validating every value against the schema and
 * falling back to the field default whenever a value is missing or malformed.
 * Always returns a complete, schema-valid settings object — never throws.
 */
export const deserializeSettings = (raw: string, schema: SettingsSchema): ProviderSettings => {
  const parsed = parseJsonObject(raw);
  const entries = schema.map((field) => [field.key, coerceField(field, parsed[field.key])] as const);
  return Object.freeze(Object.fromEntries(entries));
};

const isPlainObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  // `Object(x) === x` is true only for objects; excludes primitives, null and undefined.
  Object(value) === value && !Array.isArray(value);

const parseJsonObject = (raw: string): Readonly<Record<string, unknown>> => {
  try {
    const value: unknown = JSON.parse(raw);
    return isPlainObject(value) ? value : {};
  } catch {
    return {};
  }
};

const coerceField = (field: SettingField, value: unknown): SettingValue => {
  switch (field.kind) {
    case 'boolean':
      return typeof value === 'boolean' ? value : field.default;
    case 'number':
      return isFiniteNumber(value) ? clampNumber(field, value) : field.default;
    case 'text':
      return typeof value === 'string' ? value : field.default;
    case 'select':
      return isAllowedOption(field, value) ? value : field.default;
  }
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const clampNumber = (
  field: Extract<SettingField, { kind: 'number' }>,
  value: number,
): number => {
  const lowerBounded = field.min === undefined ? value : Math.max(field.min, value);
  return field.max === undefined ? lowerBounded : Math.min(field.max, lowerBounded);
};

const isAllowedOption = (
  field: Extract<SettingField, { kind: 'select' }>,
  value: unknown,
): value is string =>
  typeof value === 'string' && field.options.some((option) => option.value === value);
