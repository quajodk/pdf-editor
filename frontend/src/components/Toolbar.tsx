import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Tool } from '../types';

interface ToolbarProps {
  onClose: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onDownload: () => void;
  downloading?: boolean;
  zoom: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onClose,
  onZoomIn,
  onZoomOut,
  onDownload,
  downloading = false,
  zoom,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const {
    currentTool,
    setCurrentTool,
    undo,
    redo,
    historyIndex,
    history,
    penColor,
    penWidth,
    fontSize,
    fontFamily,
    fontColor,
    setPenColor,
    setPenWidth,
    setFontSize,
    setFontFamily,
    setFontColor,
    selectedAnnotationId,
    deleteAnnotation,
  } = useEditorStore();

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

  const isDrawingTool = ['pen', 'rectangle', 'circle', 'line', 'arrow', 'highlight'].includes(currentTool);
  const isTextTool = currentTool === 'text';

  return (
    <div className="bg-white border-b shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 flex-wrap gap-2">
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

          <div className="h-6 w-px bg-gray-300 mx-2"></div>

          <button
            onClick={onDownload}
            disabled={downloading}
            className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Download PDF (Ctrl+S)"
          >
            {downloading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Saving...</span>
              </>
            ) : (
              <>⬇ Save</>
            )}
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

        {/* Styling Controls */}
        {(isDrawingTool || isTextTool) && (
          <>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <div className="flex items-center gap-3">
              {/* Color Picker for Pen/Shapes or Text */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Color:</label>
                <input
                  type="color"
                  value={isTextTool ? fontColor : penColor}
                  onChange={(e) => isTextTool ? setFontColor(e.target.value) : setPenColor(e.target.value)}
                  className="w-10 h-8 rounded cursor-pointer"
                  title={isTextTool ? 'Font Color' : 'Pen Color'}
                />
              </div>

              {/* Pen Width Slider (for drawing tools) */}
              {isDrawingTool && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Width:</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={penWidth}
                    onChange={(e) => setPenWidth(Number(e.target.value))}
                    className="w-20"
                    title="Pen Width"
                  />
                  <span className="text-xs text-gray-600 w-6">{penWidth}</span>
                </div>
              )}

              {/* Font Controls (for text tool) */}
              {isTextTool && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Font:</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="px-2 py-1 text-sm border rounded"
                      title="Font Family"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Helvetica">Helvetica</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Size:</label>
                    <input
                      type="range"
                      min="8"
                      max="48"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-20"
                      title="Font Size"
                    />
                    <span className="text-xs text-gray-600 w-8">{fontSize}</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Delete Button (when annotation selected) */}
        {selectedAnnotationId && (
          <>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <button
              onClick={() => deleteAnnotation(selectedAnnotationId)}
              className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 rounded"
              title="Delete Selected (Delete key)"
            >
              🗑 Delete
            </button>
          </>
        )}

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
