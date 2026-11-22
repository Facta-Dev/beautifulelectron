// expect:no-restricted-imports
import { app } from "electron";

// expect:no-restricted-imports
import { readFileSync } from "node:fs";

// expect:no-restricted-globals
export const runtime = process;

export const broken = [app, readFileSync];
