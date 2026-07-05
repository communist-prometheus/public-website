import type { FileDescriptor } from './file';
import type { ViewerContent } from './content';
import type { ProviderSettings, SettingsSchema } from './settings';

/**
 * The heavy part of a provider — loaded lazily and cached. Importing the module
 * that exports this is what pulls in the actual rendering dependencies
 * (markdown parser, pdf.js, …), so it must live behind {@link ProviderDescriptor.load}.
 */
export interface ProviderModule<TSettings extends ProviderSettings = ProviderSettings> {
  /** Declarative settings schema, used to render the settings panel. */
  readonly settingsSchema: SettingsSchema;
  /** Complete default settings (must satisfy the schema). */
  readonly defaultSettings: TSettings;
  /** Translate a file + settings into renderable viewer content. */
  readonly render: (file: FileDescriptor, settings: TSettings) => Promise<ViewerContent>;
}

/**
 * The cheap, eagerly-registered descriptor. It must NOT import heavy renderer
 * code at module scope — only {@link ProviderDescriptor.load} may do that.
 */
export interface ProviderDescriptor<TSettings extends ProviderSettings = ProviderSettings> {
  /** Stable provider id (also the settings-storage key). */
  readonly id: string;
  /** Human-readable provider name. */
  readonly name: string;
  /** Cheap synchronous predicate deciding whether this provider matches a file. */
  readonly canHandle: (file: FileDescriptor) => boolean;
  /** Lazily import the heavy {@link ProviderModule}. Called at most once per registry. */
  readonly load: () => Promise<ProviderModule<TSettings>>;
  /** When several providers match, the highest priority wins (default 0). */
  readonly priority?: number;
}
