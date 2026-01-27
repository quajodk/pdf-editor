import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Tool } from '../types';

interface ToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onSearchToggle: () => void;
  downloading?: boolean;
  zoom: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onDownload,
  onPrint,
  onSearchToggle,
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
    selectedAnnotationIds,
    deleteSelectedAnnotations,
  } = useEditorStore();

  const tools: { id: Tool; label: string; icon: string; tooltip: string }[] = [
    { id: 'select', label: 'Select', icon: '↖', tooltip: 'Select and move annotations - Click to select, Shift+Click for multi-select' },
    { id: 'text', label: 'Text', icon: 'T', tooltip: 'Add text annotations - Click to place, double-click to edit' },
    { id: 'pen', label: 'Pen', icon: '✏', tooltip: 'Draw freehand - Click and drag to draw' },
    { id: 'eraser', label: 'Eraser', icon: '⌫', tooltip: 'Erase pen strokes - Drag over drawings to erase' },
    { id: 'rectangle', label: 'Rectangle', icon: '▭', tooltip: 'Draw rectangles - Click and drag to create' },
    { id: 'circle', label: 'Circle', icon: '○', tooltip: 'Draw circles/ellipses - Click and drag to create' },
    { id: 'line', label: 'Line', icon: '/', tooltip: 'Draw straight lines - Click and drag to create' },
    { id: 'arrow', label: 'Arrow', icon: '→', tooltip: 'Draw arrows - Click and drag to create' },
    { id: 'highlight', label: 'Highlight', icon: '▓', tooltip: 'Highlight areas - Click and drag to highlight' },
    { id: 'image', label: 'Image', icon: '🖼', tooltip: 'Add images - Click to place, then select image file' },
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
            onClick={undo}
            disabled={!canUndo}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Undo last action (Ctrl+Z or Cmd+Z)"
            aria-label="Undo last action"
          >
            ↶ Undo
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Redo undone action (Ctrl+Y or Cmd+Y)"
            aria-label="Redo undone action"
          >
            ↷ Redo
          </button>

          <div className="h-6 w-px bg-gray-300 mx-2"></div>

          <button
            onClick={onDownload}
            disabled={downloading}
            className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            title="Download PDF with all annotations (Ctrl+S or Cmd+S)"
            aria-label="Download PDF with annotations"
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

          <button
            onClick={onPrint}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            title="Print PDF with all annotations (Ctrl+P or Cmd+P)"
            aria-label="Print PDF with annotations"
          >
            🖨 Print
          </button>

          <button
            onClick={onSearchToggle}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Search text in PDF (Ctrl+F or Cmd+F)"
            aria-label="Search text in PDF"
          >
            🔍 Search
          </button>
        </div>

        <div className="flex items-center gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`px-3 py-1.5 text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                currentTool === tool.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={tool.tooltip}
              aria-label={`${tool.label} tool`}
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
                  title={isTextTool ? 'Choose text color for new annotations' : 'Choose color for pen, shapes, and highlights'}
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
                    title="Adjust line width for pen, shapes, and highlights (1-10px)"
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
                      title="Choose font family for text annotations"
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
                      title="Adjust font size for text annotations (8-48px)"
                    />
                    <span className="text-xs text-gray-600 w-8">{fontSize}</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Delete Button (when annotations selected) */}
        {selectedAnnotationIds.length > 0 && (
          <>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <button
              onClick={deleteSelectedAnnotations}
              className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
              title={`Delete selected annotation${selectedAnnotationIds.length > 1 ? 's' : ''} (Delete or Backspace key)`}
            >
              🗑 Delete {selectedAnnotationIds.length > 1 ? `(${selectedAnnotationIds.length})` : ''}
            </button>
          </>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onZoomOut}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Zoom out (- key)"
          >
            -
          </button>
          <span className="text-sm text-gray-700 w-16 text-center" title="Current zoom level">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Zoom in (+ or = key)"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
