/**
 * Minimal ambient declaration for the Bun test runtime.
 *
 * The project doesn't depend on `bun-types` (it would pull Node/Bun globals
 * into an Expo app's type surface), but `constants/theme.test.ts` needs
 * `mock.module` to stub react-native outside a Metro bundle.
 */
declare module "bun:test" {
  export const mock: {
    module: (name: string, factory: () => unknown) => void;
  };
}
