# TypeScript strict digest

The strict-mode settings and type patterns an Electron app needs, plus the
boundary types that keep data honest as it crosses process boundaries.

Sources: `PLAYBOOK_DESKTOP_ELECTRON.md` §3 (ports, contracts, tsconfig per
target), §5 (IPC shapes), §12.6 (language profile);
`PLAYBOOK_SECURITY.md`; `PLAYBOOK_FRONTEND.md`;
typescript-eslint documentation; the BeautifulElectron drop-in config
(`lints/eslint.config.mjs` of https://github.com/Facta-Dev/beautifulelectron).

## 1. Compiler settings

- `strict: true` everywhere, plus `noUncheckedIndexedAccess` — the settings
  are shared in `tsconfig.base.json` and inherited by a **per-target**
  `tsconfig`.
- One `tsconfig` per target with distinct `lib`/`types` is the wall that
  makes Electron/Node types unseen in the renderer and DOM types unseen in
  main/core; `typecheck` runs `tsc --noEmit` for every target.
- Errors-as-values over thrown strings: the shell of every API result is a
  `Result` with `AppError` carrying a closed code set aligned with the SDK
  taxonomy.

```ts
export type ErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "validation"
  | "rate-limited"
  | "network"
  | "server"
  | "upgrade-required"
  | "policy-blocked"
  | "internal";

export interface AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly requiredPermission?: string;
  readonly correlationId?: string;
}

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T,>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E,>(error: E): Result<never, E> => ({ ok: false, error });
```

- `ok`/`err` return narrow types so exhaustiveness falls out at the call
  site; a ViewModel switch on `result.ok` handles every status without an
  `as` cast.

## 2. Branded ids and route values

Stringly-typed ids let a lead id land in a tenant slot. Brand what crosses a
boundary or a URL:

```ts
export type Brand<T, K extends string> = T & { readonly __brand: K };
export type LeadId = Brand<string, "LeadId">;
export type TenantId = Brand<string, "TenantId">;

export const leadId = (raw: string): LeadId | null =>
  raw.length > 0 ? (raw as LeadId) : null;
```

- Route builders and IPC payloads take branded ids; `contracts/` is where
  untrusted strings become branded values (validated by zod, not by the
  constructor logic alone).

## 3. Boundary types

- **The IPC envelope is a plain, exact type validated with a schema** — no
  `any`, no index signatures at process boundaries:

```ts
export interface Envelope<P> {
  readonly v: 1;
  readonly id: string;
  readonly type: string;
  readonly correlationId: string;
  readonly payload: P;
}

export type Unsubscribe = () => void;
```

- Unknown incoming data is parsed (`schema.safeParse`) at the trust boundary;
  the parsed value, checked against `noUncheckedIndexedAccess` and strict
  discriminated unions, is what the domain sees.
- No `@ts-ignore`/`@ts-nocheck`; a `@ts-expect-error` carries a reason on the
  narrowest possible line; a third suppress is a contract change.
- `unknown` + a type guard, not `any` + a cast, at every edge: IPC payloads,
  SSE/dynamic data from servers (validated), parse results, `process.env`
  (read once, validated), deep links.

## 4. Lint expectations (from the drop-in config)

- `@typescript-eslint/no-floating-promises` and
  `@typescript-eslint/no-misused-promises`: async in `void` positions and
  event-listener slots must be handled — the most common real crash in
  Electron code.
- `@typescript-eslint/switch-exhaustiveness-check` on the status union and
  error codes: an added status is a compile error until handled.
- `@typescript-eslint/consistent-type-imports` keeps type-only imports
  erasable, which matters for the per-target build graphs.
- `@typescript-eslint/explicit-module-boundary-types` on the exported
  surface; `@typescript-eslint/no-implied-eval`, `no-eval`, `no-new-func`
  keep dynamic code out; `@eslint-community/eslint-comments/no-unlimited-disable`
  and `require-description` make any disable narrow and justified.
- `no-restricted-imports` / `no-restricted-globals` carry the layer walls;
  the config lists them exactly once (dependency-cruiser adds architecture).

## 5. Zod and generation

- Schemas in `contracts/` are zod with `.strict()` objects (unknown fields
  rejected at the boundary); the zod schema is the single source for the
  static type (`z.infer`), the runtime check, and the fixtures.
- DTOs, the SDK surface, the route table and the permission catalog are
  generated from the backend's OpenAPI/JSON; hand-written versions drift and
  are rejected in review.
- Prefer `satisfies` over annotations to pin a constant table to a schema;
  prefer `as const` for the IPC map so each entry's `windows` array is a
  literal type.
