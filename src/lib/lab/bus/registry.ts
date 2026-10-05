import type { PartDef } from '../catalog';
import type { Device, DeviceHost, Options } from '../devices';

/**
 * Behaviours that live outside devices.ts register here, so that devices.ts can offer them
 * without importing them (they extend `Device`, and a circular import would break that).
 */
export const deviceFactories = new Map<
  string,
  (def: PartDef, opts: Options, host: DeviceHost) => Device
>();
