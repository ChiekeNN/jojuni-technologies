/**
 * Workspace store.
 *
 * One reducer-ish update function plus a set of named actions. Components call
 * `actions.addTodo(...)` and never touch persistence directly; every action
 * goes through `update`, which appends the change and writes to localStorage.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  createInitialState,
  clearState,
  exportState,
  importState,
  loadState,
  saveState,
  todayISO,
  uid,
  type Bookmark,
  type Card,
  type CardColumn,
  type ChatMessage,
  type Checkin,
  type DocFile,
  type EventItem,
  type Folder,
  type HillScope,
  type ID,
  type LedgerEntry,
  type Note,
  type Person,
  type Post,
  type Project,
  type Reply,
  type Todo,
  type TodoList,
  type WorkspaceState,
} from "./model";

export interface WorkspaceStore {
  state: WorkspaceState;
  /** True once at least one change has been saved in this browser. */
  isPersisted: boolean;
  resetToSample: () => void;
  replaceState: (next: WorkspaceState) => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
  actions: Actions;
}

interface Actions {
  /* people */
  updatePerson: (id: ID, patch: Partial<Person>) => void;
  addPerson: (person: Omit<Person, "id">) => void;

  /* projects */
  addProject: (project: Omit<Project, "id" | "createdAt">) => ID;
  updateProject: (id: ID, patch: Partial<Project>) => void;
  archiveProject: (id: ID, archived: boolean) => void;
  deleteProject: (id: ID) => void;
  toggleProjectMember: (projectId: ID, personId: ID) => void;

  /* to-dos */
  addTodoList: (projectId: ID, title: string) => void;
  addTodo: (input: { projectId: ID; listId: ID; title: string; assigneeId?: ID | ""; due?: string }) => void;
  updateTodo: (id: ID, patch: Partial<Todo>) => void;
  toggleTodo: (id: ID) => void;
  deleteTodo: (id: ID) => void;
  addSubtask: (todoId: ID, title: string) => void;
  toggleSubtask: (todoId: ID, subtaskId: ID) => void;
  deleteSubtask: (todoId: ID, subtaskId: ID) => void;

  /* message board */
  addPost: (input: { projectId: ID; title: string; body: string; category: Post["category"]; clientVisible: boolean }) => void;
  updatePost: (id: ID, patch: Partial<Post>) => void;
  deletePost: (id: ID) => void;
  addReply: (postId: ID, body: string) => void;

  /* campfire */
  sendChat: (projectId: ID, body: string) => void;

  /* schedule */
  addEvent: (input: Omit<EventItem, "id" | "createdAt">) => void;
  updateEvent: (id: ID, patch: Partial<EventItem>) => void;
  deleteEvent: (id: ID) => void;

  /* docs & files */
  addFolder: (projectId: ID, name: string) => void;
  addDoc: (input: Omit<DocFile, "id" | "createdAt" | "updatedAt">) => ID;
  updateDoc: (id: ID, patch: Partial<DocFile>) => void;
  deleteDoc: (id: ID) => void;

  /* card table */
  addColumn: (projectId: ID, name: string) => void;
  renameColumn: (id: ID, name: string) => void;
  deleteColumn: (id: ID) => void;
  addCard: (input: { projectId: ID; columnId: ID; title: string; notes?: string; assigneeId?: ID | ""; due?: string }) => void;
  updateCard: (id: ID, patch: Partial<Card>) => void;
  moveCard: (id: ID, columnId: ID) => void;
  deleteCard: (id: ID) => void;

  /* hill chart */
  addHillScope: (projectId: ID, label: string) => void;
  setHillProgress: (id: ID, progress: number) => void;
  deleteHillScope: (id: ID) => void;

  /* check-ins */
  addCheckin: (projectId: ID, prompt: string, schedule: string) => void;
  answerCheckin: (checkinId: ID, body: string) => void;
  deleteCheckin: (id: ID) => void;

  /* notes & bookmarks */
  addNote: () => ID;
  updateNote: (id: ID, patch: Partial<Note>) => void;
  deleteNote: (id: ID) => void;
  addBookmark: (label: string, target: string) => void;
  deleteBookmark: (id: ID) => void;

  /* finance */
  addLedgerEntry: (input: { date: string; description: string; category: string; type: LedgerEntry["type"]; amount: number }) => void;
  updateLedgerEntry: (id: ID, patch: Partial<Omit<LedgerEntry, "id">>) => void;
  deleteLedgerEntry: (id: ID) => void;
}

function initialState(): WorkspaceState {
  return loadState() ?? createInitialState();
}

export function useWorkspaceStore(): WorkspaceStore {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const [isPersisted, setPersisted] = useState<boolean>(() => loadState() !== null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = useCallback((updater: (current: WorkspaceState) => WorkspaceState) => {
    setState((current) => {
      const next = updater(current);
      saveState(next);
      return next;
    });
    setPersisted(true);
  }, []);

  const actions = useMemo<Actions>(() => {
    const now = () => new Date().toISOString();
    const me = () => stateRef.current.currentUserId;

    return {
      /* ---------------- people ---------------- */
      updatePerson: (id, patch) =>
        commit((s) => ({ ...s, people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      addPerson: (person) =>
        commit((s) => ({ ...s, people: [...s.people, { ...person, id: uid("person") }] })),

      /* ---------------- projects ---------------- */
      addProject: (project) => {
        const id = uid("project");
        commit((s) => ({
          ...s,
          projects: [...s.projects, { ...project, id, createdAt: now() }],
          todoLists: [...s.todoLists, { id: uid("list"), projectId: id, title: "To-dos", createdAt: now() }],
          cardColumns: [
            ...s.cardColumns,
            ...["Backlog", "In progress", "In review", "Done"].map((name, position) => ({
              id: uid("col"),
              projectId: id,
              name,
              position,
            })),
          ],
        }));
        return id;
      },

      updateProject: (id, patch) =>
        commit((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      archiveProject: (id, archived) =>
        commit((s) => ({
          ...s,
          projects: s.projects.map((p) => (p.id === id ? { ...p, status: archived ? "archived" : "active" } : p)),
        })),

      deleteProject: (id) =>
        commit((s) => ({
          ...s,
          projects: s.projects.filter((p) => p.id !== id),
          todoLists: s.todoLists.filter((l) => l.projectId !== id),
          todos: s.todos.filter((t) => t.projectId !== id),
          posts: s.posts.filter((p) => p.projectId !== id),
          chats: s.chats.filter((c) => c.projectId !== id),
          events: s.events.filter((e) => e.projectId !== id),
          folders: s.folders.filter((f) => f.projectId !== id),
          docs: s.docs.filter((d) => d.projectId !== id),
          cardColumns: s.cardColumns.filter((c) => c.projectId !== id),
          cards: s.cards.filter((c) => c.projectId !== id),
          hill: s.hill.filter((h) => h.projectId !== id),
          checkins: s.checkins.filter((c) => c.projectId !== id),
        })),

      toggleProjectMember: (projectId, personId) =>
        commit((s) => ({
          ...s,
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  members: p.members.includes(personId)
                    ? p.members.filter((m) => m !== personId)
                    : [...p.members, personId],
                }
              : p,
          ),
        })),

      /* ---------------- to-dos ---------------- */
      addTodoList: (projectId, title) =>
        commit((s) => ({
          ...s,
          todoLists: [...s.todoLists, { id: uid("list"), projectId, title, createdAt: now() }],
        })),

      addTodo: ({ projectId, listId, title, assigneeId = "", due = "" }) =>
        commit((s) => ({
          ...s,
          todos: [
            ...s.todos,
            {
              id: uid("todo"),
              listId,
              projectId,
              title,
              assigneeId,
              due,
              done: false,
              notes: "",
              subtasks: [],
              createdAt: now(),
            },
          ],
        })),

      updateTodo: (id, patch) =>
        commit((s) => ({ ...s, todos: s.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

      toggleTodo: (id) =>
        commit((s) => ({
          ...s,
          todos: s.todos.map((t) =>
            t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? now() : undefined } : t,
          ),
        })),

      deleteTodo: (id) => commit((s) => ({ ...s, todos: s.todos.filter((t) => t.id !== id) })),

      addSubtask: (todoId, title) =>
        commit((s) => ({
          ...s,
          todos: s.todos.map((t) =>
            t.id === todoId ? { ...t, subtasks: [...t.subtasks, { id: uid("sub"), title, done: false }] } : t,
          ),
        })),

      toggleSubtask: (todoId, subtaskId) =>
        commit((s) => ({
          ...s,
          todos: s.todos.map((t) =>
            t.id === todoId
              ? { ...t, subtasks: t.subtasks.map((sub) => (sub.id === subtaskId ? { ...sub, done: !sub.done } : sub)) }
              : t,
          ),
        })),

      deleteSubtask: (todoId, subtaskId) =>
        commit((s) => ({
          ...s,
          todos: s.todos.map((t) =>
            t.id === todoId ? { ...t, subtasks: t.subtasks.filter((sub) => sub.id !== subtaskId) } : t,
          ),
        })),

      /* ---------------- message board ---------------- */
      addPost: ({ projectId, title, body, category, clientVisible }) =>
        commit((s) => ({
          ...s,
          posts: [
            {
              id: uid("post"),
              projectId,
              title,
              body,
              authorId: me(),
              category,
              pinned: false,
              clientVisible,
              replies: [],
              createdAt: now(),
            },
            ...s.posts,
          ],
        })),

      updatePost: (id, patch) =>
        commit((s) => ({ ...s, posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      deletePost: (id) => commit((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) })),

      addReply: (postId, body) => {
        const reply: Reply = { id: uid("reply"), authorId: me(), body, createdAt: now() };
        commit((s) => ({
          ...s,
          posts: s.posts.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, reply] } : p)),
        }));
      },

      /* ---------------- campfire ---------------- */
      sendChat: (projectId, body) => {
        const message: ChatMessage = { id: uid("chat"), projectId, authorId: me(), body, createdAt: now() };
        commit((s) => ({ ...s, chats: [...s.chats, message] }));
      },

      /* ---------------- schedule ---------------- */
      addEvent: (input) =>
        commit((s) => ({ ...s, events: [...s.events, { ...input, id: uid("event"), createdAt: now() }] })),

      updateEvent: (id, patch) =>
        commit((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

      deleteEvent: (id) => commit((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) })),

      /* ---------------- docs & files ---------------- */
      addFolder: (projectId, name) =>
        commit((s) => ({ ...s, folders: [...s.folders, { id: uid("folder"), projectId, name }] })),

      addDoc: (input) => {
        const id = uid("doc");
        commit((s) => ({
          ...s,
          docs: [...s.docs, { ...input, id, createdAt: now(), updatedAt: now() }],
        }));
        return id;
      },

      updateDoc: (id, patch) =>
        commit((s) => ({
          ...s,
          docs: s.docs.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: now() } : d)),
        })),

      deleteDoc: (id) => commit((s) => ({ ...s, docs: s.docs.filter((d) => d.id !== id) })),

      /* ---------------- card table ---------------- */
      addColumn: (projectId, name) =>
        commit((s) => {
          const existing = s.cardColumns.filter((c) => c.projectId === projectId);
          const position = existing.length ? Math.max(...existing.map((c) => c.position)) + 1 : 0;
          const column: CardColumn = { id: uid("col"), projectId, name, position };
          return { ...s, cardColumns: [...s.cardColumns, column] };
        }),

      renameColumn: (id, name) =>
        commit((s) => ({ ...s, cardColumns: s.cardColumns.map((c) => (c.id === id ? { ...c, name } : c)) })),

      deleteColumn: (id) =>
        commit((s) => ({
          ...s,
          cardColumns: s.cardColumns.filter((c) => c.id !== id),
          cards: s.cards.filter((c) => c.columnId !== id),
        })),

      addCard: ({ projectId, columnId, title, notes = "", assigneeId = "", due = "" }) =>
        commit((s) => ({
          ...s,
          cards: [...s.cards, { id: uid("card"), projectId, columnId, title, notes, assigneeId, due, createdAt: now() }],
        })),

      updateCard: (id, patch) =>
        commit((s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      moveCard: (id, columnId) =>
        commit((s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, columnId } : c)) })),

      deleteCard: (id) => commit((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== id) })),

      /* ---------------- hill chart ---------------- */
      addHillScope: (projectId, label) =>
        commit((s) => ({
          ...s,
          hill: [...s.hill, { id: uid("hill"), projectId, label, progress: 0 } as HillScope],
        })),

      setHillProgress: (id, progress) =>
        commit((s) => ({
          ...s,
          hill: s.hill.map((h) => (h.id === id ? { ...h, progress: Math.max(0, Math.min(100, progress)) } : h)),
        })),

      deleteHillScope: (id) => commit((s) => ({ ...s, hill: s.hill.filter((h) => h.id !== id) })),

      /* ---------------- check-ins ---------------- */
      addCheckin: (projectId, prompt, schedule) =>
        commit((s) => ({
          ...s,
          checkins: [...s.checkins, { id: uid("checkin"), projectId, prompt, schedule, answers: [] } as Checkin],
        })),

      answerCheckin: (checkinId, body) =>
        commit((s) => ({
          ...s,
          checkins: s.checkins.map((c) =>
            c.id === checkinId
              ? { ...c, answers: [...c.answers, { id: uid("ans"), authorId: me(), body, createdAt: now() }] }
              : c,
          ),
        })),

      deleteCheckin: (id) => commit((s) => ({ ...s, checkins: s.checkins.filter((c) => c.id !== id) })),

      /* ---------------- notes & bookmarks ---------------- */
      addNote: () => {
        const id = uid("note");
        commit((s) => ({
          ...s,
          notes: [{ id, title: "Untitled note", body: "", updatedAt: now() } as Note, ...s.notes],
        }));
        return id;
      },

      updateNote: (id, patch) =>
        commit((s) => ({
          ...s,
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)),
        })),

      deleteNote: (id) => commit((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) })),

      addBookmark: (label, target) =>
        commit((s) => ({
          ...s,
          bookmarks: [...s.bookmarks, { id: uid("bm"), label, target, createdAt: now() } as Bookmark],
        })),

      deleteBookmark: (id) => commit((s) => ({ ...s, bookmarks: s.bookmarks.filter((b) => b.id !== id) })),

      /* ---------------- finance ---------------- */
      addLedgerEntry: (input) =>
        commit((s) => ({
          ...s,
          ledger: [{ ...input, id: uid("led") } as LedgerEntry, ...s.ledger],
        })),

      updateLedgerEntry: (id, patch) =>
        commit((s) => ({ ...s, ledger: s.ledger.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

      deleteLedgerEntry: (id) => commit((s) => ({ ...s, ledger: s.ledger.filter((l) => l.id !== id) })),
    };
  }, [commit]);

  const resetToSample = useCallback(() => {
    clearState();
    setState(createInitialState());
    setPersisted(false);
  }, []);

  const replaceState = useCallback((next: WorkspaceState) => {
    saveState(next);
    setState(next);
    setPersisted(true);
  }, []);

  const exportJSON = useCallback(() => exportState(stateRef.current), []);

  const importJSON = useCallback(
    (json: string) => {
      const next = importState(json);
      saveState(next);
      setState(next);
      setPersisted(true);
    },
    [],
  );

  // Keep two tabs of the workspace in step.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== "jojuni.workspace.v2" || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue) as WorkspaceState;
        if (next?.version === 2) setState(next);
      } catch {
        /* ignore malformed writes */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { state, isPersisted, resetToSample, replaceState, exportJSON, importJSON, actions };
}

/** Convenience: today's date, used by several forms. */
export { todayISO };

export const WorkspaceContext = createContext<WorkspaceStore | null>(null);

export function useWorkspace(): WorkspaceStore {
  const store = useContext(WorkspaceContext);
  if (!store) throw new Error("useWorkspace must be used inside <WorkspaceContext.Provider>");
  return store;
}

export type { Actions, Folder, TodoList, Person };
