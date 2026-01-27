import { create } from 'zustand';
import { Annotation, Tool } from '../types';

interface EditorState {
  currentTool: Tool;
  currentPage: number;
  totalPages: number;
  zoom: number;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  history: Annotation[][];
  historyIndex: number;
  penColor: string;
  penWidth: number;
  fontSize: number;
  fontFamily: string;
  fontColor: string;

  // Actions
  setCurrentTool: (tool: Tool) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  setZoom: (zoom: number) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  setSelectedAnnotation: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  clearAnnotations: () => void;
  setPenColor: (color: string) => void;
  setPenWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setFontColor: (color: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentTool: 'select',
  currentPage: 1,
  totalPages: 0,
  zoom: 1,
  annotations: [],
  selectedAnnotationId: null,
  history: [[]],
  historyIndex: 0,
  penColor: '#000000',
  penWidth: 2,
  fontSize: 16,
  fontFamily: 'Arial',
  fontColor: '#000000',

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
      };
    }),

  setSelectedAnnotation: (id) => set({ selectedAnnotationId: id }),

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
}));
