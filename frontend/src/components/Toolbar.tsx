import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Tool } from '../types';

interface ToolbarProps {
  onClose: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoom: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onClose,
  onZoomIn,
  onZoomOut,
  zoom,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const { currentTool, setCurrentTool, undo, redo, historyIndex, history } = useEditorStore();

  const tools: { id: Tool; label: string; icon: string }[] = [
    { id: 'select', label: 'Select', icon: '↖' },
    { id: 'text', label: 'Text', icon: 'T' },
    { id: 'pen', label: 'Pen', icon: '✏' },
    { id: 'eraser', label: 'Eraser', icon: '⌫' },
    { id: 'rectangle', label: 'Rectangle', icon: '▭' },
    { id: 'circle', label: 'Circle', icon: '○' },
    { id: 'line', label: 'Line', icon: '/' },
    { id: 'arrow', label: 'Arrow', icon: '→' },
    { id: 'highlight', label: 'Highlight', icon: '▓' },
    { id: 'image', label: 'Image', icon: '🖼' },
  ];

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="bg-white border-b shadow-sm">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded"
          >
            ← Back
          </button>

          <div className="h-6 w-px bg-gray-300 mx-2"></div>

          <button
            onClick={undo}
            disabled={!canUndo}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            ↷ Redo
          </button>
        </div>

        <div className="flex items-center gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                currentTool === tool.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={tool.label}
            >
              <span className="text-lg">{tool.icon}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onZoomOut}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            title="Zoom Out"
          >
            -
          </button>
          <span className="text-sm text-gray-700 w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            title="Zoom In"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
