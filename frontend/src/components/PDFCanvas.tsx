import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Annotation, TextAnnotation, ShapeAnnotation, HighlightAnnotation, ImageAnnotation } from '../types';

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
    updateAnnotation,
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
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null);
  const [pendingImagePosition, setPendingImagePosition] = useState<{ x: number; y: number } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // For drag and resize
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null);
  const [eraserPath, setEraserPath] = useState<{ x: number; y: number }[]>([]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'text') {
      setTextInput({ x, y, text: '' });
    } else if (currentTool === 'image') {
      setPendingImagePosition({ x, y });
      imageInputRef.current?.click();
    } else if (currentTool === 'pen') {
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
    } else if (currentTool === 'eraser') {
      setIsDrawing(true);
      setEraserPath([{ x, y }]);
    } else if (['rectangle', 'circle', 'line', 'arrow', 'highlight'].includes(currentTool)) {
      setIsDrawing(true);
      setShapeStart({ x, y });
      setShapeEnd({ x, y });
    } else if (currentTool === 'select') {
      // Check if clicking on a resize handle first
      if (selectedAnnotationId) {
        const selectedAnn = pageAnnotations.find(ann => ann.id === selectedAnnotationId);
        if (selectedAnn && selectedAnn.type === 'image') {
          const imgAnn = selectedAnn as ImageAnnotation;
          const handleSize = 8;
          const imgX = imgAnn.x;
          const imgY = imgAnn.y;
          const imgW = imgAnn.width || 0;
          const imgH = imgAnn.height || 0;

          // Check each corner handle
          if (x >= imgX + imgW - handleSize && x <= imgX + imgW + handleSize &&
              y >= imgY + imgH - handleSize && y <= imgY + imgH + handleSize) {
            // Bottom-right handle
            setIsResizing(true);
            setResizeHandle('se');
            setDragStart({ x, y });
            return;
          } else if (x >= imgX - handleSize && x <= imgX + handleSize &&
                     y >= imgY + imgH - handleSize && y <= imgY + imgH + handleSize) {
            // Bottom-left handle
            setIsResizing(true);
            setResizeHandle('sw');
            setDragStart({ x, y });
            return;
          } else if (x >= imgX + imgW - handleSize && x <= imgX + imgW + handleSize &&
                     y >= imgY - handleSize && y <= imgY + handleSize) {
            // Top-right handle
            setIsResizing(true);
            setResizeHandle('ne');
            setDragStart({ x, y });
            return;
          } else if (x >= imgX - handleSize && x <= imgX + handleSize &&
                     y >= imgY - handleSize && y <= imgY + handleSize) {
            // Top-left handle
            setIsResizing(true);
            setResizeHandle('nw');
            setDragStart({ x, y });
            return;
          }
        }
      }

      // Find annotation at click position
      const clickedAnnotation = pageAnnotations.find((ann) => {
        if (ann.type === 'text') {
          // Simple bounding box check for text
          return x >= ann.x && x <= ann.x + 100 && y >= ann.y - 20 && y <= ann.y + 20;
        } else if (ann.type === 'image') {
          // Bounding box check for images
          return x >= ann.x && x <= ann.x + (ann.width || 0) &&
                 y >= ann.y && y <= ann.y + (ann.height || 0);
        } else if (ann.type === 'shape') {
          return x >= ann.x && x <= ann.x + (ann.width || 0) &&
                 y >= ann.y && y <= ann.y + (ann.height || 0);
        } else if (ann.type === 'highlight') {
          return x >= ann.x && x <= ann.x + (ann.width || 0) &&
                 y >= ann.y && y <= ann.y + (ann.height || 0);
        }
        return false;
      });

      if (clickedAnnotation) {
        setSelectedAnnotation(clickedAnnotation.id);
        // Start dragging
        setIsDragging(true);
        setDragStart({ x, y });
      } else {
        setSelectedAnnotation(null);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find text annotation at click position and enable editing
    const clickedAnnotation = pageAnnotations.find((ann) => {
      if (ann.type === 'text') {
        // Simple bounding box check for text
        return x >= ann.x && x <= ann.x + 100 && y >= ann.y - 20 && y <= ann.y + 20;
      }
      return false;
    });

    if (clickedAnnotation && clickedAnnotation.type === 'text') {
      setEditingTextId(clickedAnnotation.id);
      const textAnn = clickedAnnotation as TextAnnotation;
      setTextInput({ x: clickedAnnotation.x, y: clickedAnnotation.y, text: textAnn.data.text });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle resizing
    if (isResizing && dragStart && selectedAnnotationId && resizeHandle) {
      const selectedAnn = pageAnnotations.find(ann => ann.id === selectedAnnotationId);
      if (selectedAnn && selectedAnn.type === 'image') {
        const imgAnn = selectedAnn as ImageAnnotation;
        const dx = x - dragStart.x;

        let newX = imgAnn.x;
        let newY = imgAnn.y;
        let newWidth = imgAnn.width || 0;
        let newHeight = imgAnn.height || 0;

        // Calculate aspect ratio to maintain proportions
        const aspectRatio = (imgAnn.data.originalWidth || 1) / (imgAnn.data.originalHeight || 1);

        if (resizeHandle === 'se') {
          // Bottom-right: increase width and height
          newWidth = Math.max(50, (imgAnn.width || 0) + dx);
          newHeight = newWidth / aspectRatio;
        } else if (resizeHandle === 'sw') {
          // Bottom-left: move left edge and increase width
          newWidth = Math.max(50, (imgAnn.width || 0) - dx);
          newHeight = newWidth / aspectRatio;
          newX = imgAnn.x + (imgAnn.width || 0) - newWidth;
        } else if (resizeHandle === 'ne') {
          // Top-right: move top edge and increase width
          newWidth = Math.max(50, (imgAnn.width || 0) + dx);
          newHeight = newWidth / aspectRatio;
          newY = imgAnn.y + (imgAnn.height || 0) - newHeight;
        } else if (resizeHandle === 'nw') {
          // Top-left: move both edges
          newWidth = Math.max(50, (imgAnn.width || 0) - dx);
          newHeight = newWidth / aspectRatio;
          newX = imgAnn.x + (imgAnn.width || 0) - newWidth;
          newY = imgAnn.y + (imgAnn.height || 0) - newHeight;
        }

        updateAnnotation(selectedAnnotationId, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
        setDragStart({ x, y });
      }
      return;
    }

    // Handle dragging
    if (isDragging && dragStart && selectedAnnotationId) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      const selectedAnn = pageAnnotations.find(ann => ann.id === selectedAnnotationId);
      if (selectedAnn) {
        updateAnnotation(selectedAnnotationId, {
          x: selectedAnn.x + dx,
          y: selectedAnn.y + dy,
        });
        setDragStart({ x, y });
      }
      return;
    }

    if (!isDrawing) return;

    if (currentTool === 'pen') {
      setCurrentPath((prev) => [...prev, { x, y }]);
    } else if (currentTool === 'eraser') {
      setEraserPath((prev) => [...prev, { x, y }]);
    } else if (['rectangle', 'circle', 'line', 'arrow', 'highlight'].includes(currentTool)) {
      setShapeEnd({ x, y });
    }
  };

  const handleMouseUp = () => {
    // Reset dragging and resizing states
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      return;
    }

    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setDragStart(null);
      return;
    }

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
    } else if (currentTool === 'eraser' && eraserPath.length > 0) {
      // Find and delete drawings that intersect with eraser path
      const eraserThreshold = 10; // Distance threshold for erasing
      pageAnnotations.forEach((ann) => {
        if (ann.type === 'drawing') {
          // Check if any point in the drawing paths intersects with eraser path
          const shouldErase = ann.data.paths.some((path: any) =>
            path.some((point: any) =>
              eraserPath.some((eraserPoint) =>
                Math.sqrt(
                  Math.pow(point.x - eraserPoint.x, 2) +
                  Math.pow(point.y - eraserPoint.y, 2)
                ) <= eraserThreshold
              )
            )
          );
          if (shouldErase) {
            deleteAnnotation(ann.id);
          }
        }
      });
      setEraserPath([]);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingImagePosition) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const annotation: ImageAnnotation = {
          id: Date.now().toString(),
          type: 'image',
          pageNumber,
          x: pendingImagePosition.x,
          y: pendingImagePosition.y,
          width: img.width > 300 ? 300 : img.width, // Default max width 300px
          height: img.height > 300 ? (300 / img.width) * img.height : img.height,
          data: {
            src: event.target?.result as string,
            originalWidth: img.width,
            originalHeight: img.height,
          },
        };
        addAnnotation(annotation);
        setPendingImagePosition(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleTextSubmit = () => {
    if (textInput && textInput.text.trim()) {
      if (editingTextId) {
        // Update existing annotation
        updateAnnotation(editingTextId, {
          data: {
            ...annotations.find(a => a.id === editingTextId)?.data,
            text: textInput.text,
          },
        });
        setEditingTextId(null);
      } else {
        // Add new annotation
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
        className="absolute inset-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ pointerEvents: 'auto', cursor: currentTool === 'select' ? 'default' : 'crosshair' }}
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

          {/* Render eraser path (visual feedback) */}
          {eraserPath.length > 0 && (
            <path
              d={`M ${eraserPath.map((p) => `${p.x},${p.y}`).join(' L ')}`}
              stroke="#FF0000"
              strokeWidth={15}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.3}
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
              const isSelected = annotation.id === selectedAnnotationId;
              if (shape.data.shapeType === 'rectangle') {
                return (
                  <g key={annotation.id}>
                    <rect
                      x={annotation.x}
                      y={annotation.y}
                      width={annotation.width}
                      height={annotation.height}
                      stroke={shape.data.strokeColor}
                      strokeWidth={shape.data.strokeWidth}
                      fill={shape.data.fillColor || 'none'}
                    />
                    {isSelected && (
                      <rect
                        x={annotation.x - 2}
                        y={annotation.y - 2}
                        width={(annotation.width || 0) + 4}
                        height={(annotation.height || 0) + 4}
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fill="none"
                        strokeDasharray="5,5"
                      />
                    )}
                  </g>
                );
              } else if (shape.data.shapeType === 'circle') {
                return (
                  <g key={annotation.id}>
                    <ellipse
                      cx={annotation.x + (annotation.width || 0) / 2}
                      cy={annotation.y + (annotation.height || 0) / 2}
                      rx={(annotation.width || 0) / 2}
                      ry={(annotation.height || 0) / 2}
                      stroke={shape.data.strokeColor}
                      strokeWidth={shape.data.strokeWidth}
                      fill={shape.data.fillColor || 'none'}
                    />
                    {isSelected && (
                      <rect
                        x={annotation.x - 2}
                        y={annotation.y - 2}
                        width={(annotation.width || 0) + 4}
                        height={(annotation.height || 0) + 4}
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fill="none"
                        strokeDasharray="5,5"
                      />
                    )}
                  </g>
                );
              } else if (shape.data.shapeType === 'line') {
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
                    {isSelected && (
                      <line
                        x1={annotation.x}
                        y1={annotation.y}
                        x2={shape.data.endX}
                        y2={shape.data.endY}
                        stroke="#3B82F6"
                        strokeWidth={(shape.data.strokeWidth || 0) + 4}
                        opacity={0.3}
                      />
                    )}
                  </g>
                );
              } else if (shape.data.shapeType === 'arrow') {
                const angle = Math.atan2(
                  (shape.data.endY || 0) - annotation.y,
                  (shape.data.endX || 0) - annotation.x
                ) * 180 / Math.PI;
                return (
                  <g key={annotation.id}>
                    {isSelected && (
                      <line
                        x1={annotation.x}
                        y1={annotation.y}
                        x2={shape.data.endX}
                        y2={shape.data.endY}
                        stroke="#3B82F6"
                        strokeWidth={(shape.data.strokeWidth || 0) + 4}
                        opacity={0.3}
                      />
                    )}
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
              const isSelected = annotation.id === selectedAnnotationId;
              return (
                <g key={annotation.id}>
                  <rect
                    x={annotation.x}
                    y={annotation.y}
                    width={annotation.width}
                    height={annotation.height}
                    fill={highlight.data.color}
                    opacity={highlight.data.opacity}
                  />
                  {isSelected && (
                    <rect
                      x={annotation.x - 2}
                      y={annotation.y - 2}
                      width={(annotation.width || 0) + 4}
                      height={(annotation.height || 0) + 4}
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fill="none"
                      strokeDasharray="5,5"
                    />
                  )}
                </g>
              );
            }
            return null;
          })}
        </svg>

        {/* Render text annotations */}
        {pageAnnotations.map((annotation) => {
          if (annotation.type === 'text' && annotation.id !== editingTextId) {
            const textAnn = annotation as TextAnnotation;
            const isSelected = annotation.id === selectedAnnotationId;
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
                  border: isSelected ? '2px dashed #3B82F6' : 'none',
                  padding: isSelected ? '2px' : '0',
                }}
              >
                {textAnn.data.text}
              </div>
            );
          }
          return null;
        })}

        {/* Render image annotations */}
        {pageAnnotations.map((annotation) => {
          if (annotation.type === 'image') {
            const imgAnn = annotation as ImageAnnotation;
            const isSelected = annotation.id === selectedAnnotationId;
            return (
              <div key={annotation.id}>
                <img
                  src={imgAnn.data.src}
                  alt="annotation"
                  className="absolute pointer-events-none"
                  style={{
                    left: annotation.x,
                    top: annotation.y,
                    width: annotation.width,
                    height: annotation.height,
                    border: isSelected ? '2px solid #3B82F6' : 'none',
                  }}
                />
                {/* Resize handles for selected image */}
                {isSelected && (
                  <>
                    {/* Top-left handle */}
                    <div
                      className="absolute bg-blue-500 border border-white"
                      style={{
                        left: annotation.x - 4,
                        top: annotation.y - 4,
                        width: 8,
                        height: 8,
                        cursor: 'nw-resize',
                        pointerEvents: 'none',
                      }}
                    />
                    {/* Top-right handle */}
                    <div
                      className="absolute bg-blue-500 border border-white"
                      style={{
                        left: annotation.x + (annotation.width || 0) - 4,
                        top: annotation.y - 4,
                        width: 8,
                        height: 8,
                        cursor: 'ne-resize',
                        pointerEvents: 'none',
                      }}
                    />
                    {/* Bottom-left handle */}
                    <div
                      className="absolute bg-blue-500 border border-white"
                      style={{
                        left: annotation.x - 4,
                        top: annotation.y + (annotation.height || 0) - 4,
                        width: 8,
                        height: 8,
                        cursor: 'sw-resize',
                        pointerEvents: 'none',
                      }}
                    />
                    {/* Bottom-right handle */}
                    <div
                      className="absolute bg-blue-500 border border-white"
                      style={{
                        left: annotation.x + (annotation.width || 0) - 4,
                        top: annotation.y + (annotation.height || 0) - 4,
                        width: 8,
                        height: 8,
                        cursor: 'se-resize',
                        pointerEvents: 'none',
                      }}
                    />
                  </>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

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
                setEditingTextId(null);
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
