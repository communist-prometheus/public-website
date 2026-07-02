import type {
  FileDescriptor,
  PageMount,
  ProviderModule,
  ProviderSettings,
  SettingsSchema,
  ViewerContent,
} from '@web-file-reader/core';
import { defaultsFromSchema } from '@web-file-reader/core';
import { toImageSource } from './object-url';

/** Declarative settings for the image provider. */
export const settingsSchema: SettingsSchema = [
  {
    kind: 'select',
    key: 'fit',
    label: 'Fit',
    default: 'contain',
    options: [
      { value: 'contain', label: 'Contain' },
      { value: 'cover', label: 'Cover' },
      { value: 'none', label: 'None' },
      { value: 'width', label: 'Fit width' },
    ],
  },
  { kind: 'number', key: 'zoom', label: 'Zoom', default: 1, min: 0.1, max: 8, step: 0.1 },
  { kind: 'boolean', key: 'pixelated', label: 'Pixelated', default: false },
];

/** Complete defaults derived from {@link settingsSchema}. */
export const defaultSettings: ProviderSettings = defaultsFromSchema(settingsSchema);

/** Read a string setting, falling back to a default when absent/mistyped. */
const readString = (settings: ProviderSettings, key: string, fallback: string): string => {
  const value = settings[key];
  return typeof value === 'string' ? value : fallback;
};

/** Read a number setting, falling back to a default when absent/mistyped. */
const readNumber = (settings: ProviderSettings, key: string, fallback: number): number => {
  const value = settings[key];
  return typeof value === 'number' ? value : fallback;
};

/** Read a boolean setting, falling back to a default when absent/mistyped. */
const readBoolean = (settings: ProviderSettings, key: string, fallback: boolean): boolean => {
  const value = settings[key];
  return typeof value === 'boolean' ? value : fallback;
};

/** Apply the dimension/object-fit part of the settings to an image element. */
const applyFit = (img: HTMLImageElement, fit: string): void => {
  switch (fit) {
    case 'width':
      img.style.width = '100%';
      img.style.height = 'auto';
      return;
    default:
      img.style.objectFit = fit;
      return;
  }
};

/** Pure styling helper: mutate `img` to reflect the given settings. */
export const applyImageStyles = (img: HTMLImageElement, settings: ProviderSettings): void => {
  const fit = readString(settings, 'fit', 'contain');
  const zoom = readNumber(settings, 'zoom', 1);
  const pixelated = readBoolean(settings, 'pixelated', false);
  applyFit(img, fit);
  img.style.transform = `scale(${zoom})`;
  img.style.imageRendering = pixelated ? 'pixelated' : 'auto';
};

/** Build the imperative mount that paints an `<img>` into the container. */
const createMount = (file: FileDescriptor, settings: ProviderSettings): PageMount => (container) => {
  const source = toImageSource(file.source);
  const img = container.ownerDocument.createElement('img');
  img.src = source.url;
  img.alt = file.name;
  img.loading = 'lazy';
  img.decoding = 'async';
  applyImageStyles(img, settings);
  container.appendChild(img);
  return () => {
    source.revoke();
    container.replaceChildren();
  };
};

/** Produce single-page viewer content for an image file. */
const render = (file: FileDescriptor, settings: ProviderSettings): Promise<ViewerContent> =>
  Promise.resolve({
    kind: 'single',
    page: { id: 'image', content: { kind: 'mount', mount: createMount(file, settings) } },
  });

/** The heavy provider module, imported lazily by the descriptor. */
export const module: ProviderModule = { settingsSchema, defaultSettings, render };
