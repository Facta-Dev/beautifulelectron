// The ViewModel owns the state and the commands; the View only binds.
// This module is pure: it imports nothing from electron or node:*, so the
// node:test suite runs without an Electron binary (see scripts/check-build.sh).

export type Status = "empty" | "ready";

export interface Note {
  readonly id: string;
  readonly title: string;
}

// The port the ViewModel depends on; the main process (or the test) wires the
// adapter. The ViewModel never imports electron.
export interface NotesPort {
  list(): readonly Note[];
  add(title: string): Note;
}

export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

export class NotesViewModel {
  private readonly listeners: Array<() => void> = [];
  private notes: readonly Note[] = [];

  constructor(private readonly port: NotesPort) {}

  refresh(): Result<readonly Note[]> {
    try {
      this.notes = this.port.list();
      this.emit();
      return { ok: true, value: this.notes };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "unknown" };
    }
  }

  add(title: string): Result<Note> {
    const title_ = title.trim();
    if (title_.length < 1 || title_.length > 120) {
      return { ok: false, error: "title must be 1..120 characters" };
    }
    try {
      const note = this.port.add(title_);
      this.notes = this.port.list();
      this.emit();
      return { ok: true, value: note };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "unknown" };
    }
  }

  // A copy, not the live list: the View may freeze or diff it freely.
  snapshot(): readonly Note[] {
    return [...this.notes];
  }

  status(): Status {
    return this.notes.length === 0 ? "empty" : "ready";
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

// The adapter this example ships: the same port the renderer reaches through
// the typed `notes.list` / `notes.add` channels in main.ts.
export class InMemoryNotes implements NotesPort {
  private notes: Note[] = [];
  private nextId = 1;

  list(): readonly Note[] {
    return [...this.notes];
  }

  add(title: string): Note {
    const note: Note = { id: String(this.nextId++), title };
    this.notes = [...this.notes, note];
    return note;
  }
}
