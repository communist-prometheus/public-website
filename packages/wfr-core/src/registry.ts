import type { FileDescriptor } from './file';
import type { ProviderDescriptor, ProviderModule } from './provider';

/**
 * Registry of providers. Resolution is cheap (synchronous predicates); the heavy
 * {@link ProviderModule} for a provider is imported lazily on first use and then
 * cached — so a provider's renderer code is downloaded once and reused.
 */
export interface ProviderRegistry {
  /** Register a provider descriptor. Re-registering the same id replaces it. */
  readonly register: (descriptor: ProviderDescriptor) => void;
  /** All registered descriptors, ordered by descending priority. */
  readonly list: () => readonly ProviderDescriptor[];
  /** Highest-priority descriptor whose `canHandle` matches, if any. */
  readonly resolve: (file: FileDescriptor) => ProviderDescriptor | undefined;
  /** Resolve, lazily load (cached), and return the provider module for a file. */
  readonly load: (file: FileDescriptor) => Promise<ProviderModule | undefined>;
  /** Load (cached) a specific provider module by id. */
  readonly loadById: (id: string) => Promise<ProviderModule | undefined>;
}

const byPriorityDesc = (a: ProviderDescriptor, b: ProviderDescriptor): number =>
  (b.priority ?? 0) - (a.priority ?? 0);

/** Create an empty provider registry with a per-id lazy-module cache. */
export const createProviderRegistry = (): ProviderRegistry => {
  const descriptors = new Map<string, ProviderDescriptor>();
  // Caches the in-flight/resolved load promise so concurrent calls dedupe and
  // the heavy module is fetched exactly once per provider.
  const modules = new Map<string, Promise<ProviderModule>>();

  const register: ProviderRegistry['register'] = (descriptor) => {
    descriptors.set(descriptor.id, descriptor);
    modules.delete(descriptor.id);
  };

  const list: ProviderRegistry['list'] = () =>
    [...descriptors.values()].sort(byPriorityDesc);

  const resolve: ProviderRegistry['resolve'] = (file) =>
    list().find((descriptor) => descriptor.canHandle(file));

  const loadById: ProviderRegistry['loadById'] = (id) => {
    const descriptor = descriptors.get(id);
    if (descriptor === undefined) return Promise.resolve(undefined);
    const cached = modules.get(id);
    if (cached !== undefined) return cached;
    const pending = descriptor.load().catch((error: unknown) => {
      // Evict failed loads so a later attempt can retry.
      modules.delete(id);
      throw error;
    });
    modules.set(id, pending);
    return pending;
  };

  const load: ProviderRegistry['load'] = (file) => {
    const descriptor = resolve(file);
    return descriptor === undefined ? Promise.resolve(undefined) : loadById(descriptor.id);
  };

  return { register, list, resolve, load, loadById };
};
