import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Annotation, TextAnnotation, ShapeAnnotation, HighlightAnnotation } from '../types';

interface PDFCanvasProps {
  pageNumber: number;
  scale: number;
}

const PDFCanvas: React.FC<PDFCanvasProps> = ({ pageNumber, scale }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const {
    currentTool,
    annotations,
    addAnnotation,
    deleteAnnotation,
    selectedAnnotationId,
    setSelectedAnnotation,
    penColor,
    penWidth,
    fontSize,
    fontFamily,
    fontColor,
  } = useEditorStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [textInput, setTextInput] = useState<{ x: number; y: number; text: string } | null>(null);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'text') {
      setTextInput({ x, y, text: '' });
    } else if (currentTool === 'pen') {
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
    } else if (['rectangle', 'circle', 'line', 'arrow', 'highlight'].includes(currentTool)) {
      setIsDrawing(true);
      setShapeStart({ x, y });
      setShapeEnd({ x, y });
    } else if (currentTool === 'select') {
      // Find annotation at click position
      const clickedAnnotation = pageAnnotations.find((ann) => {
        if (ann.type === 'text') {
          // Simple bounding box check for text
          return x >= ann.x && x <= ann.x + 100 && y >= ann.y - 20 && y <= ann.y + 20;
        }
        // TODO: Add click detection for other annotation types
        return false;
      });
      setSelectedAnnotation(clickedAnnotation?.id || null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'pen') {
      setCurrentPath((prev) => [...prev, { x, y }]);
    } else if (['rectangle', 'circle', 'line', 'arrow', 'highlight'].includes(currentTool)) {
      setShapeEnd({ x, y });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;

    if (currentTool === 'pen' && currentPath.length > 0) {
      const annotation: Annotation = {
        id: Date.now().toString(),
        type: 'drawing',
        pageNumber,
        x: currentPath[0].x,
        y: currentPath[0].y,
        data: {
          paths: [currentPath],
          color: penColor,
          width: penWidth,
        },
      };
      addAnnotation(annotation);
      setCurrentPath([]);
    } else if (['rectangle', 'circle', 'line', 'arrow'].includes(currentTool) && shapeStart && shapeEnd) {
      const annotation: ShapeAnnotation = {
        id: Date.now().toString(),
        type: 'shape',
        pageNumber,
        x: shapeStart.x,
        y: shapeStart.y,
        width: Math.abs(shapeEnd.x - shapeStart.x),
        height: Math.abs(shapeEnd.y - shapeStart.y),
        data: {
          shapeType: currentTool as 'rectangle' | 'circle' | 'line' | 'arrow',
          strokeColor: penColor,
          strokeWidth: penWidth,
          fillColor: 'transparent',
          endX: shapeEnd.x,
          endY: shapeEnd.y,
        },
      };
      addAnnotation(annotation);
      setShapeStart(null);
      setShapeEnd(null);
    } else if (currentTool === 'highlight' && shapeStart && shapeEnd) {
      const annotation: HighlightAnnotation = {
        id: Date.now().toString(),
        type: 'highlight',
        pageNumber,
        x: Math.min(shapeStart.x, shapeEnd.x),
        y: Math.min(shapeStart.y, shapeEnd.y),
        width: Math.abs(shapeEnd.x - shapeStart.x),
        height: Math.abs(shapeEnd.y - shapeStart.y),
        data: {
          color: penColor,
          opacity: 0.3,
        },
      };
      addAnnotation(annotation);
      setShapeStart(null);
      setShapeEnd(null);
    }

    setIsDrawing(false);
  };

  const handleTextSubmit = () => {
    if (textInput && textInput.text.trim()) {
      const annotation: TextAnnotation = {
        id: Date.now().toString(),
        type: 'text',
        pageNumber,
        x: textInput.x,
        y: textInput.y,
        data: {
          text: textInput.text,
          fontSize,
          fontFamily,
          color: fontColor,
        },
      };
      addAnnotation(annotation);
    }
    setTextInput(null);
  };

  // Handle keyboard shortcuts for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId) {
          deleteAnnotation(selectedAnnotationId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, deleteAnnotation]);

  const pageAnnotations = annotations.filter((ann) => ann.pageNumber === pageNumber);

  return (
    <>
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ pointerEvents: currentTool !== 'select' ? 'auto' : 'none' }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Render current drawing path */}
          {currentPath.length > 0 && (
            <path
              d={`M ${currentPath.map((p) => `${p.x},${p.y}`).join(' L ')}`}
              stroke={penColor}
              strokeWidth={penWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Render current shape being drawn */}
          {shapeStart && shapeEnd && (
            <>
              {currentTool === 'rectangle' && (
                <rect
                  x={Math.min(shapeStart.x, shapeEnd.x)}
                  y={Math.min(shapeStart.y, shapeEnd.y)}
                  width={Math.abs(shapeEnd.x - shapeStart.x)}
                  height={Math.abs(shapeEnd.y - shapeStart.y)}
                  stroke={penColor}
                  strokeWidth={penWidth}
                  fill="none"
                />
              )}
              {currentTool === 'circle' && (
                <ellipse
                  cx={shapeStart.x + (shapeEnd.x - shapeStart.x) / 2}
                  cy={shapeStart.y + (shapeEnd.y - shapeStart.y) / 2}
                  rx={Math.abs(shapeEnd.x - shapeStart.x) / 2}
                  ry={Math.abs(shapeEnd.y - shapeStart.y) / 2}
                  stroke={penColor}
                  strokeWidth={penWidth}
                  fill="none"
                />
              )}
              {currentTool === 'line' && (
                <line
                  x1={shapeStart.x}
                  y1={shapeStart.y}
                  x2={shapeEnd.x}
                  y2={shapeEnd.y}
                  stroke={penColor}
                  strokeWidth={penWidth}
                />
              )}
              {currentTool === 'arrow' && (
                <g>
                  <line
                    x1={shapeStart.x}
                    y1={shapeStart.y}
                    x2={shapeEnd.x}
                    y2={shapeEnd.y}
                    stroke={penColor}
                    strokeWidth={penWidth}
                  />
                  {/* Arrow head */}
                  <polygon
                    points={`${shapeEnd.x},${shapeEnd.y} ${shapeEnd.x - 10},${shapeEnd.y - 5} ${shapeEnd.x - 10},${shapeEnd.y + 5}`}
                    fill={penColor}
                    transform={`rotate(${Math.atan2(shapeEnd.y - shapeStart.y, shapeEnd.x - shapeStart.x) * 180 / Math.PI} ${shapeEnd.x} ${shapeEnd.y})`}
                  />
                </g>
              )}
              {currentTool === 'highlight' && (
                <rect
                  x={Math.min(shapeStart.x, shapeEnd.x)}
                  y={Math.min(shapeStart.y, shapeEnd.y)}
                  width={Math.abs(shapeEnd.x - shapeStart.x)}
                  height={Math.abs(shapeEnd.y - shapeStart.y)}
                  fill={penColor}
                  opacity={0.3}
                />
              )}
            </>
          )}

          {/* Render saved annotations */}
          {pageAnnotations.map((annotation) => {
            if (annotation.type === 'drawing') {
              return annotation.data.paths.map((path: any, idx: number) => (
                <path
                  key={`${annotation.id}-${idx}`}
                  d={`M ${path.map((p: any) => `${p.x},${p.y}`).join(' L ')}`}
                  stroke={annotation.data.color}
                  strokeWidth={annotation.data.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ));
            } else if (annotation.type === 'shape') {
              const shape = annotation as ShapeAnnotation;
              if (shape.data.shapeType === 'rectangle') {
                return (
                  <rect
                    key={annotation.id}
                    x={annotation.x}
                    y={annotation.y}
                    width={annotation.width}
                    height={annotation.height}
                    stroke={shape.data.strokeColor}
                    strokeWidth={shape.data.strokeWidth}
                    fill={shape.data.fillColor || 'none'}
                  />
                );
              } else if (shape.data.shapeType === 'circle') {
                return (
                  <ellipse
                    key={annotation.id}
                    cx={annotation.x + (annotation.width || 0) / 2}
                    cy={annotation.y + (annotation.height || 0) / 2}
                    rx={(annotation.width || 0) / 2}
                    ry={(annotation.height || 0) / 2}
                    stroke={shape.data.strokeColor}
                    strokeWidth={shape.data.strokeWidth}
                    fill={shape.data.fillColor || 'none'}
                  />
                );
              } else if (shape.data.shapeType === 'line') {
                return (
                  <line
                    key={annotation.id}
                    x1={annotation.x}
                    y1={annotation.y}
                    x2={shape.data.endX}
                    y2={shape.data.endY}
                    stroke={shape.data.strokeColor}
                    strokeWidth={shape.data.strokeWidth}
                  />
                );
              } else if (shape.data.shapeType === 'arrow') {
                const angle = Math.atan2(
                  (shape.data.endY || 0) - annotation.y,
                  (shape.data.endX || 0) - annotation.x
                ) * 180 / Math.PI;
                return (
                  <g key={annotation.id}>
                    <line
                      x1={annotation.x}
                      y1={annotation.y}
                      x2={shape.data.endX}
                      y2={shape.data.endY}
                      stroke={shape.data.strokeColor}
                      strokeWidth={shape.data.strokeWidth}
                    />
                    <polygon
                      points={`${shape.data.endX},${shape.data.endY} ${(shape.data.endX || 0) - 10},${(shape.data.endY || 0) - 5} ${(shape.data.endX || 0) - 10},${(shape.data.endY || 0) + 5}`}
                      fill={shape.data.strokeColor}
                      transform={`rotate(${angle} ${shape.data.endX} ${shape.data.endY})`}
                    />
                  </g>
                );
              }
            } else if (annotation.type === 'highlight') {
              const highlight = annotation as HighlightAnnotation;
              return (
                <rect
                  key={annotation.id}
                  x={annotation.x}
                  y={annotation.y}
                  width={annotation.width}
                  height={annotation.height}
                  fill={highlight.data.color}
                  opacity={highlight.data.opacity}
                />
              );
            }
            return null;
          })}
        </svg>

        {/* Render text annotations */}
        {pageAnnotations.map((annotation) => {
          if (annotation.type === 'text') {
            const textAnn = annotation as TextAnnotation;
            return (
              <div
                key={annotation.id}
                className="absolute"
                style={{
                  left: annotation.x,
                  top: annotation.y,
                  fontSize: textAnn.data.fontSize,
                  fontFamily: textAnn.data.fontFamily,
                  color: textAnn.data.color,
                  fontWeight: textAnn.data.bold ? 'bold' : 'normal',
                  fontStyle: textAnn.data.italic ? 'italic' : 'normal',
                  textDecoration: textAnn.data.underline ? 'underline' : 'none',
                  pointerEvents: 'none',
                }}
              >
                {textAnn.data.text}
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Text input overlay */}
      {textInput && (
        <div
          className="absolute bg-white border-2 border-blue-500 p-1"
          style={{
            left: textInput.x,
            top: textInput.y,
            zIndex: 1000,
          }}
        >
          <input
            type="text"
            autoFocus
            value={textInput.text}
            onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTextSubmit();
              } else if (e.key === 'Escape') {
                setTextInput(null);
              }
            }}
            onBlur={handleTextSubmit}
            className="outline-none px-2 py-1"
            style={{
              fontSize,
              fontFamily,
              color: fontColor,
              minWidth: '200px',
            }}
            placeholder="Type text..."
          />
        </div>
      )}
    </>
  );
};

export default PDFCanvas;
