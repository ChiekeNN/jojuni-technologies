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
  STORAGE_KEY,
  todayISO,
  WORKSPACE_STATE_VERSION,
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
import {
  hydrate as hydrateChat,
  pushDelete as pushChatDelete,
  pushEdit as pushChatEdit,
  pushMembers as pushChatMembers,
  pushMessage as pushChatMessage,
  pushReactions as pushChatReactions,
  pushThread as pushChatThread,
} from "./chat-backend";
import {
  canDeleteMessage,
  canEditMessage,
  canSeeThread,
  directKey,
  readKey,
  type ChatAttachment,
  type ChatMessageEntry,
  type ChatThread,
} from "./chat";

/** What a finance form produces: everything on an entry except its id. */
export type LedgerDraft = Omit<LedgerEntry, "id">;

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
  /** Removes the person and takes them off every project; their work stays. */
  deletePerson: (id: ID) => void;

  /* projects */
  addProject: (project: Omit<Project, "id" | "createdAt">) => ID;
  updateProject: (id: ID, patch: Partial<Project>) => void;
  archiveProject: (id: ID, archived: boolean) => void;
  deleteProject: (id: ID) => void;
  toggleProjectMember: (projectId: ID, personId: ID) => void;

  /* to-dos */
  /** Returns the new list id, so a caller can add a task to it at once. */
  addTodoList: (projectId: ID, title: string) => ID;
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

  /* campfire (project chat — separate from the internal messenger) */
  sendChat: (projectId: ID, body: string) => void;

  /* internal chat */
  openDirect: (personId: ID) => ID;
  createGroup: (input: { title: string; memberIds: ID[] }) => ID;
  updateGroup: (threadId: ID, patch: { title?: string; memberIds?: ID[]; muted?: boolean }) => void;
  leaveGroup: (threadId: ID) => void;
  sendMessage: (input: {
    threadId: ID;
    body: string;
    attachments?: ChatAttachment[];
    replyTo?: { messageId: ID; authorId: ID; snippet: string };
    forwardedFrom?: { chatTitle: string; authorName: string };
  }) => ID;
  editMessage: (messageId: ID, body: string) => void;
  /** Soft delete — the row stays, showing "deleted", so replies still make sense. */
  deleteMessage: (messageId: ID) => void;
  toggleReaction: (messageId: ID, emoji: string) => void;
  markRead: (threadId: ID) => void;
  togglePin: (threadId: ID) => void;

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
  addLedgerEntry: (input: LedgerDraft) => void;
  updateLedgerEntry: (id: ID, patch: Partial<LedgerDraft>) => void;
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

      deletePerson: (id) =>
        commit((s) => ({
          ...s,
          people: s.people.filter((person) => person.id !== id),
          // A removed client leaves their projects behind: the work is real
          // history, and the project keeps the client's name as text. Only the
          // link is dropped, so nothing points at a person who is gone.
          projects: s.projects.map((project) => ({
            ...project,
            members: project.members.filter((memberId) => memberId !== id),
            clientId: project.clientId === id ? undefined : project.clientId,
          })),
          // Unassign rather than delete the work: losing a to-do because its
          // owner left would be a far worse bug than an unassigned one.
          todos: s.todos.map((todo) => (todo.assigneeId === id ? { ...todo, assigneeId: "" } : todo)),
          cards: s.cards.map((card) => (card.assigneeId === id ? { ...card, assigneeId: "" } : card)),
        })),

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
      addTodoList: (projectId, title) => {
        const list: TodoList = { id: uid("list"), projectId, title, createdAt: now() };
        commit((s) => ({ ...s, todoLists: [...s.todoLists, list] }));
        return list.id;
      },

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

      /* ---------------- internal chat ---------------- */
      openDirect: (personId) => {
        const existing = stateRef.current.chat.threads.find(
          (thread) =>
            thread.kind === "direct" &&
            directKey(thread.memberIds[0] ?? "", thread.memberIds[1] ?? "") === directKey(me(), personId),
        );
        if (existing) return existing.id;
        const thread: ChatThread = {
          id: uid("thread"),
          kind: "direct",
          title: "",
          memberIds: [me(), personId],
          createdBy: me(),
          createdAt: now(),
        };
        commit((s) => ({ ...s, chat: { ...s.chat, threads: [...s.chat.threads, thread] } }));
        void pushChatThread(thread);
        return thread.id;
      },

      createGroup: ({ title, memberIds }) => {
        const thread: ChatThread = {
          id: uid("thread"),
          kind: "group",
          title,
          // The creator is always a member; a group you cannot see is a bug.
          memberIds: Array.from(new Set([me(), ...memberIds])),
          createdBy: me(),
          createdAt: now(),
          color: "#111111",
        };
        const systemMessage: ChatMessageEntry = {
          id: uid("msg"),
          chatId: thread.id,
          authorId: me(),
          kind: "system",
          body: `${stateRef.current.people.find((p) => p.id === me())?.name ?? "Someone"} created “${title}”.`,
          attachments: [],
          reactions: [],
          createdAt: now(),
        };
        commit((s) => ({
          ...s,
          chat: {
            ...s.chat,
            threads: [...s.chat.threads, thread],
            messages: [...s.chat.messages, systemMessage],
          },
        }));
        void pushChatThread(thread);
        void pushChatMessage(systemMessage);
        return thread.id;
      },

      updateGroup: (threadId, patch) => {
        if (patch.memberIds) void pushChatMembers(threadId, patch.memberIds);
        commit((s) => ({
          ...s,
          chat: {
            ...s.chat,
            threads: s.chat.threads.map((thread) =>
              thread.id === threadId
                ? {
                    ...thread,
                    ...patch,
                    // Never let an edit remove the person doing the editing.
                    memberIds: patch.memberIds
                      ? Array.from(new Set([thread.createdBy, ...patch.memberIds]))
                      : thread.memberIds,
                  }
                : thread,
            ),
          },
        }));
      },

      leaveGroup: (threadId) =>
        commit((s) => ({
          ...s,
          chat: {
            ...s.chat,
            threads: s.chat.threads.map((thread) =>
              thread.id === threadId
                ? { ...thread, memberIds: thread.memberIds.filter((id) => id !== me()) }
                : thread,
            ),
          },
        })),

      sendMessage: ({ threadId, body, attachments, replyTo, forwardedFrom }) => {
        const list = attachments ?? [];
        const kind = list.some((item) => item.mime.startsWith("image/"))
          ? "image"
          : list.some((item) => item.mime.startsWith("audio/"))
            ? "voice"
            : list.length
              ? "file"
              : "text";
        const message: ChatMessageEntry = {
          id: uid("msg"),
          chatId: threadId,
          authorId: me(),
          kind,
          body,
          attachments: list,
          reactions: [],
          replyTo,
          forwardedFrom,
          createdAt: now(),
        };
        commit((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: [...s.chat.messages, message],
            // Sending is reading: a thread you just spoke in has no unread.
            reads: { ...s.chat.reads, [readKey(me(), threadId)]: message.createdAt },
          },
        }));
        void pushChatMessage(message);
        return message.id;
      },

      editMessage: (messageId, body) => {
        const editedAt = now();
        void pushChatEdit(messageId, body, editedAt);
        commit((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: s.chat.messages.map((message) =>
              message.id === messageId && canEditMessage(message, me())
                ? { ...message, body, editedAt }
                : message,
            ),
          },
        }));
      },

      deleteMessage: (messageId) => {
        const person = stateRef.current.people.find((p) => p.id === me());
        const target = stateRef.current.chat.messages.find((message) => message.id === messageId);
        // Checked here as well as in the UI: the rule has to hold wherever the
        // action is called from, not just where a button happens to be hidden.
        if (!target || !canDeleteMessage(target, person, me())) return;
        const deletedAt = now();
        void pushChatDelete(messageId, me(), deletedAt);
        commit((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: s.chat.messages.map((message) =>
              message.id === messageId
                ? { ...message, deletedAt, deletedBy: me(), body: "", attachments: [], reactions: [] }
                : message,
            ),
          },
        }));
      },

      toggleReaction: (messageId, emoji) => {
        // Recomputed below in the reducer; the database gets the same shape.
        const snapshot = (() => {
          const message = stateRef.current.chat.messages.find((item) => item.id === messageId);
          if (!message || message.deletedAt) return null;
          const existing = message.reactions.find((reaction) => reaction.emoji === emoji);
          if (!existing) return [...message.reactions, { emoji, personIds: [me()] }];
          const mineAlready = existing.personIds.includes(me());
          const personIds = mineAlready
            ? existing.personIds.filter((id) => id !== me())
            : [...existing.personIds, me()];
          return message.reactions
            .map((reaction) => (reaction.emoji === emoji ? { ...reaction, personIds } : reaction))
            .filter((reaction) => reaction.personIds.length > 0);
        })();
        if (snapshot) void pushChatReactions(messageId, snapshot);
        commit((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: s.chat.messages.map((message) => {
              if (message.id !== messageId || message.deletedAt) return message;
              const existing = message.reactions.find((reaction) => reaction.emoji === emoji);
              if (!existing) {
                return { ...message, reactions: [...message.reactions, { emoji, personIds: [me()] }] };
              }
              const mine = existing.personIds.includes(me());
              const personIds = mine
                ? existing.personIds.filter((id) => id !== me())
                : [...existing.personIds, me()];
              return {
                ...message,
                reactions: message.reactions
                  .map((reaction) => (reaction.emoji === emoji ? { ...reaction, personIds } : reaction))
                  // A reaction nobody holds any more is not a reaction.
                  .filter((reaction) => reaction.personIds.length > 0),
              };
            }),
          },
        }));
      },

      markRead: (threadId) =>
        commit((s) => {
          const thread = s.chat.threads.find((item) => item.id === threadId);
          // Reading a thread you are not a member of must not mark anything.
          if (!thread || !canSeeThread(thread, me())) return s;
          return {
            ...s,
            chat: { ...s.chat, reads: { ...s.chat.reads, [readKey(me(), threadId)]: now() } },
          };
        }),

      togglePin: (threadId) =>
        commit((s) => {
          const mine = s.chat.pins[me()] ?? [];
          const next = mine.includes(threadId)
            ? mine.filter((id) => id !== threadId)
            : [...mine, threadId];
          return { ...s, chat: { ...s.chat, pins: { ...s.chat.pins, [me()]: next } } };
        }),

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

  /**
   * Pull the chat down from the database, once.
   *
   * Read-only against the UI until it succeeds: a build with no database, a
   * missing session or an unapplied schema all leave the local chat exactly
   * where it was. Database threads win where ids collide, because the database
   * is the shared truth and the local copy is one browser's stale view.
   */
  useEffect(() => {
    let cancelled = false;
    void hydrateChat().then((result) => {
      if (cancelled || !result) return;
      if (!result.chat.threads.length) return;
      setState((current) => {
        const dbIds = new Set(result.chat.threads.map((thread) => thread.id));
        const localOnly = current.chat.threads.filter((thread) => !dbIds.has(thread.id));
        const dbMessageIds = new Set(result.chat.messages.map((message) => message.id));
        const localOnlyMessages = current.chat.messages.filter(
          (message) =>
            !dbMessageIds.has(message.id) && localOnly.some((thread) => thread.id === message.chatId),
        );
        const next: WorkspaceState = {
          ...current,
          chat: {
            threads: [...result.chat.threads, ...localOnly],
            messages: [...result.chat.messages, ...localOnlyMessages],
            // Read markers and pins are per-browser conveniences, not shared
            // facts, so the local ones are kept.
            reads: current.chat.reads,
            pins: current.chat.pins,
          },
        };
        saveState(next);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep two tabs of the workspace in step.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue) as WorkspaceState;
        if (next?.version === WORKSPACE_STATE_VERSION) setState(next);
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
