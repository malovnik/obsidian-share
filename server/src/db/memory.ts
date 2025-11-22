// In-memory хранилище для локальной разработки
import { Note } from './schema';

export const memoryStore = new Map<string, Note>();

export const memoryDb = {
  notes: {
    insert: async (note: any) => {
      const newNote: Note = {
        ...note,
        viewCount: note.viewCount || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      memoryStore.set(note.id, newNote);
      return [newNote];
    },

    select: async (id: string) => {
      const note = memoryStore.get(id);
      return note ? [note] : [];
    },

    update: async (id: string, updates: Partial<Note>) => {
      const note = memoryStore.get(id);
      if (!note) return [];

      const updated = { ...note, ...updates, updatedAt: new Date() };
      memoryStore.set(id, updated);
      return [updated];
    },

    delete: async (id: string) => {
      const note = memoryStore.get(id);
      if (!note) return [];

      const deleted = { ...note, isDeleted: true };
      memoryStore.set(id, deleted);
      return [deleted];
    },
  },
};
