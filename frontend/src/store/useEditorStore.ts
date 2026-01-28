import { create } from 'zustand';
import { Annotation, Tool, SearchResult } from '../types';

export interface PDFDocument {
  id: string;
  name: string;
  file: File;
  currentPage: number;
  totalPages: number;
  zoom: number;
  annotations: Annotation[];
  history: Annotation[][];
  historyIndex: number;
}

interface EditorState {
  // Multiple file support
  documents: PDFDocument[];
  currentDocumentId: string | null;

  // Current document state (derived from current document)
  currentTool: Tool;
  currentPage: number;
  totalPages: number;
  zoom: number;
  annotations: Annotation[];
  selectedAnnotationId: string | null; // Keep for backward compatibility
  selectedAnnotationIds: string[]; // New: multi-select support
  history: Annotation[][];
  historyIndex: number;
  penColor: string;
  penWidth: number;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  searchQuery: string;
  searchResults: SearchResult[];
  currentSearchIndex: number;
  isSearchOpen: boolean;
  darkMode: boolean;

  // Multiple file actions
  addDocument: (file: File) => string; // Returns document ID
  removeDocument: (id: string) => void;
  setCurrentDocument: (id: string) => void;
  getCurrentDocument: () => PDFDocument | null;

  // Actions
  setCurrentTool: (tool: Tool) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  setZoom: (zoom: number) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  setSelectedAnnotation: (id: string | null) => void;
  setSelectedAnnotations: (ids: string[]) => void; // New: set multiple selections
  toggleAnnotationSelection: (id: string) => void; // New: toggle selection (for Shift+click)
  deleteSelectedAnnotations: () => void; // New: delete all selected
  undo: () => void;
  redo: () => void;
  clearAnnotations: () => void;
  setPenColor: (color: string) => void;
  setPenWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setFontColor: (color: string) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setCurrentSearchIndex: (index: number) => void;
  setIsSearchOpen: (isOpen: boolean) => void;
  nextSearchResult: () => void;
  previousSearchResult: () => void;
  clearSearch: () => void;
  toggleDarkMode: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Multiple file state
  documents: [],
  currentDocumentId: null,

  // Current document state
  currentTool: 'select',
  currentPage: 1,
  totalPages: 0,
  zoom: 1,
  annotations: [],
  selectedAnnotationId: null,
  selectedAnnotationIds: [],
  history: [[]],
  historyIndex: 0,
  penColor: '#000000',
  penWidth: 2,
  fontSize: 16,
  fontFamily: 'Arial',
  fontColor: '#000000',
  searchQuery: '',
  searchResults: [],
  currentSearchIndex: -1,
  isSearchOpen: false,
  darkMode: false,

  // Multiple file actions
  addDocument: (file: File) => {
    const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newDoc: PDFDocument = {
      id,
      name: file.name,
      file,
      currentPage: 1,
      totalPages: 0,
      zoom: 1,
      annotations: [],
      history: [[]],
      historyIndex: 0,
    };

    set((state) => ({
      documents: [...state.documents, newDoc],
      currentDocumentId: id,
      currentPage: 1,
      totalPages: 0,
      zoom: 1,
      annotations: [],
      history: [[]],
      historyIndex: 0,
      selectedAnnotationId: null,
      selectedAnnotationIds: [],
    }));

    return id;
  },

  removeDocument: (id: string) =>
    set((state) => {
      // Clean up the document being removed to prevent memory leaks
      const removedDoc = state.documents.find(doc => doc.id === id);
      if (removedDoc) {
        // Revoke any object URLs created for image annotations
        removedDoc.annotations.forEach(ann => {
          if (ann.type === 'image' && (ann as any).data?.src?.startsWith('blob:')) {
            URL.revokeObjectURL((ann as any).data.src);
          }
        });
      }

      const newDocs = state.documents.filter(doc => doc.id !== id);
      const newCurrentId = state.currentDocumentId === id
        ? (newDocs.length > 0 ? newDocs[0].id : null)
        : state.currentDocumentId;

      const newDoc = newDocs.find(d => d.id === newCurrentId);

      return {
        documents: newDocs,
        currentDocumentId: newCurrentId,
        currentPage: newDoc?.currentPage || 1,
        totalPages: newDoc?.totalPages || 0,
        zoom: newDoc?.zoom || 1,
        annotations: newDoc?.annotations || [],
        history: newDoc?.history || [[]],
        historyIndex: newDoc?.historyIndex || 0,
        selectedAnnotationId: null,
        selectedAnnotationIds: [],
      };
    }),

  setCurrentDocument: (id: string) =>
    set((state) => {
      // Save current document state before switching
      if (state.currentDocumentId) {
        const updatedDocs = state.documents.map(doc =>
          doc.id === state.currentDocumentId
            ? {
                ...doc,
                currentPage: state.currentPage,
                totalPages: state.totalPages,
                zoom: state.zoom,
                annotations: state.annotations,
                history: state.history,
                historyIndex: state.historyIndex,
              }
            : doc
        );

        const newDoc = updatedDocs.find(d => d.id === id);
        if (!newDoc) return state;

        return {
          documents: updatedDocs,
          currentDocumentId: id,
          currentPage: newDoc.currentPage,
          totalPages: newDoc.totalPages,
          zoom: newDoc.zoom,
          annotations: newDoc.annotations,
          history: newDoc.history,
          historyIndex: newDoc.historyIndex,
          selectedAnnotationId: null,
          selectedAnnotationIds: [],
        };
      } else {
        const newDoc = state.documents.find(d => d.id === id);
        if (!newDoc) return state;

        return {
          currentDocumentId: id,
          currentPage: newDoc.currentPage,
          totalPages: newDoc.totalPages,
          zoom: newDoc.zoom,
          annotations: newDoc.annotations,
          history: newDoc.history,
          historyIndex: newDoc.historyIndex,
          selectedAnnotationId: null,
          selectedAnnotationIds: [],
        };
      }
    }),

  getCurrentDocument: () => {
    const state = get();
    return state.documents.find(d => d.id === state.currentDocumentId) || null;
  },

  setCurrentTool: (tool) => set({ currentTool: tool }),

  setCurrentPage: (page) =>
    set((state) => {
      const updates: any = { currentPage: page };
      if (state.currentDocumentId) {
        updates.documents = state.documents.map(doc =>
          doc.id === state.currentDocumentId ? { ...doc, currentPage: page } : doc
        );
      }
      return updates;
    }),

  setTotalPages: (pages) =>
    set((state) => {
      const updates: any = { totalPages: pages };
      if (state.currentDocumentId) {
        updates.documents = state.documents.map(doc =>
          doc.id === state.currentDocumentId ? { ...doc, totalPages: pages } : doc
        );
      }
      return updates;
    }),

  setZoom: (zoom) => {
    const newZoom = Math.min(Math.max(zoom, 0.5), 3);
    set((state) => {
      const updates: any = { zoom: newZoom };
      if (state.currentDocumentId) {
        updates.documents = state.documents.map(doc =>
          doc.id === state.currentDocumentId ? { ...doc, zoom: newZoom } : doc
        );
      }
      return updates;
    });
  },

  addAnnotation: (annotation) =>
    set((state) => {
      const newAnnotations = [...state.annotations, annotation];
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newAnnotations);
      const newHistoryIndex = newHistory.length - 1;

      const updates: any = {
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistoryIndex,
      };

      if (state.currentDocumentId) {
        updates.documents = state.documents.map(doc =>
          doc.id === state.currentDocumentId
            ? { ...doc, annotations: newAnnotations, history: newHistory, historyIndex: newHistoryIndex }
            : doc
        );
      }

      return updates;
    }),

  updateAnnotation: (id, updates) =>
    set((state) => {
      const newAnnotations = state.annotations.map((ann) =>
        ann.id === id ? { ...ann, ...updates } : ann
      );
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newAnnotations);
      const newHistoryIndex = newHistory.length - 1;

      const stateUpdates: any = {
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistoryIndex,
      };

      if (state.currentDocumentId) {
        stateUpdates.documents = state.documents.map(doc =>
          doc.id === state.currentDocumentId
            ? { ...doc, annotations: newAnnotations, history: newHistory, historyIndex: newHistoryIndex }
            : doc
        );
      }

      return stateUpdates;
    }),

  deleteAnnotation: (id) =>
    set((state) => {
      const newAnnotations = state.annotations.filter((ann) => ann.id !== id);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newAnnotations);
      const newHistoryIndex = newHistory.length - 1;

      const updates: any = {
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistoryIndex,
        selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
        selectedAnnotationIds: state.selectedAnnotationIds.filter(selId => selId !== id),
      };

      if (state.currentDocumentId) {
        updates.documents = state.documents.map(doc =>
          doc.id === state.currentDocumentId
            ? { ...doc, annotations: newAnnotations, history: newHistory, historyIndex: newHistoryIndex }
            : doc
        );
      }

      return updates;
    }),

  setSelectedAnnotation: (id) => set({
    selectedAnnotationId: id,
    selectedAnnotationIds: id ? [id] : []
  }),

  setSelectedAnnotations: (ids) => set({
    selectedAnnotationIds: ids,
    selectedAnnotationId: ids.length === 1 ? ids[0] : null
  }),

  toggleAnnotationSelection: (id) =>
    set((state) => {
      const isSelected = state.selectedAnnotationIds.includes(id);
      const newIds = isSelected
        ? state.selectedAnnotationIds.filter(selId => selId !== id)
        : [...state.selectedAnnotationIds, id];
      return {
        selectedAnnotationIds: newIds,
        selectedAnnotationId: newIds.length === 1 ? newIds[0] : null,
      };
    }),

  deleteSelectedAnnotations: () =>
    set((state) => {
      if (state.selectedAnnotationIds.length === 0) return state;
      const newAnnotations = state.annotations.filter(
        (ann) => !state.selectedAnnotationIds.includes(ann.id)
      );
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newAnnotations);
      const newHistoryIndex = newHistory.length - 1;

      const updates: any = {
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistoryIndex,
        selectedAnnotationId: null,
        selectedAnnotationIds: [],
      };

      if (state.currentDocumentId) {
        updates.documents = state.documents.map(doc =>
          doc.id === state.currentDocumentId
            ? { ...doc, annotations: newAnnotations, history: newHistory, historyIndex: newHistoryIndex }
            : doc
        );
      }

      return updates;
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        const newAnnotations = state.history[newIndex];

        const updates: any = {
          annotations: newAnnotations,
          historyIndex: newIndex,
        };

        if (state.currentDocumentId) {
          updates.documents = state.documents.map(doc =>
            doc.id === state.currentDocumentId
              ? { ...doc, annotations: newAnnotations, historyIndex: newIndex }
              : doc
          );
        }

        return updates;
      }
      return state;
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        const newAnnotations = state.history[newIndex];

        const updates: any = {
          annotations: newAnnotations,
          historyIndex: newIndex,
        };

        if (state.currentDocumentId) {
          updates.documents = state.documents.map(doc =>
            doc.id === state.currentDocumentId
              ? { ...doc, annotations: newAnnotations, historyIndex: newIndex }
              : doc
          );
        }

        return updates;
      }
      return state;
    }),

  clearAnnotations: () =>
    set({
      annotations: [],
      history: [[]],
      historyIndex: 0,
      selectedAnnotationId: null,
    }),

  setPenColor: (color) => set({ penColor: color }),
  setPenWidth: (width) => set({ penWidth: width }),
  setFontSize: (size) => set({ fontSize: size }),
  setFontFamily: (family) => set({ fontFamily: family }),
  setFontColor: (color) => set({ fontColor: color }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({
    searchResults: results,
    currentSearchIndex: results.length > 0 ? 0 : -1
  }),
  setCurrentSearchIndex: (index) => set({ currentSearchIndex: index }),
  setIsSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),

  nextSearchResult: () =>
    set((state) => {
      if (state.searchResults.length === 0) return state;
      const newIndex = (state.currentSearchIndex + 1) % state.searchResults.length;
      return { currentSearchIndex: newIndex };
    }),

  previousSearchResult: () =>
    set((state) => {
      if (state.searchResults.length === 0) return state;
      const newIndex = state.currentSearchIndex - 1 < 0
        ? state.searchResults.length - 1
        : state.currentSearchIndex - 1;
      return { currentSearchIndex: newIndex };
    }),

  clearSearch: () => set({
    searchQuery: '',
    searchResults: [],
    currentSearchIndex: -1
  }),

  toggleDarkMode: () =>
    set((state) => {
      const newDarkMode = !state.darkMode;
      // Update the document's root class for Tailwind dark mode
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { darkMode: newDarkMode };
    }),
}));
