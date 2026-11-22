// The SDK is a plain TypeScript client. Clean control: no markers, so
// nothing may fire here — the SDK stays platform-free and React-free.
export const sdk = {
  notes: {
    get: (id: string): Promise<{ id: string }> => Promise.resolve({ id }),
  },
};
