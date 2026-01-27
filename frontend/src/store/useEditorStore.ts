import { create } from 'zustand';
import { Annotation, Tool, SearchResult } from '../types';

interface EditorState {
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
}

export const useEditorStore = create<EditorState>((set) => ({
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

  setCurrentTool: (tool) => set({ currentTool: tool }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (pages) => set({ totalPages: pages }),
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.5), 3) }),

  addAnnotation: (annotation) =>
    set((state) => {
      const newAnnotations = [...state.annotations, annotation];
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newAnnotations);
      return {
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }),

  updateAnnotation: (id, updates) =>
    set((state) => {
      const newAnnotations = state.annotations.map((ann) =>
        ann.id === id ? { ...ann, ...updates } : ann
      );
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newAnnotations);
      return {
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }),

  deleteAnnotation: (id) =>
    set((state) => {
      const newAnnotations = state.annotations.filter((ann) => ann.id !== id);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newAnnotations);
      return {
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
        selectedAnnotationIds: state.selectedAnnotationIds.filter(selId => selId !== id),
      };
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
      return {
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        selectedAnnotationId: null,
        selectedAnnotationIds: [],
      };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          annotations: state.history[newIndex],
          historyIndex: newIndex,
        };
      }
      return state;
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          annotations: state.history[newIndex],
          historyIndex: newIndex,
        };
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
}));
