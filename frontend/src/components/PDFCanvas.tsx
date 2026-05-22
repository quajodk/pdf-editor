import React, { useRef, useEffect, useState } from "react";
import { useEditorStore } from "../store/useEditorStore";
import {
  Annotation,
  TextAnnotation,
  ShapeAnnotation,
  HighlightAnnotation,
  ImageAnnotation,
  TextEditAnnotation,
  ExtractedTextItem,
} from "../types";

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
    selectedAnnotationIds,
    setSelectedAnnotation,
    toggleAnnotationSelection,
    deleteSelectedAnnotations,
    penColor,
    penWidth,
    fontSize,
    fontFamily,
    fontColor,
    extractedText,
    updateExtractedTextItem,
  } = useEditorStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>(
    []
  );
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingExtractedText, setEditingExtractedText] =
    useState<ExtractedTextItem | null>(null);
  // When the user clicks an already-edited block to revise it, remember the
  // existing TextEditAnnotation id so the submit handler updates that one
  // instead of stacking a second textEdit on top of the same source block.
  const [reeditingAnnotationId, setReeditingAnnotationId] = useState<
    string | null
  >(null);
  // Per-block formatting state for the open edit modal. Initialised from the
  // source block's detected formatting (or the existing annotation's saved
  // formatting on re-edit) when the modal opens; the B/I toolbar toggles it.
  const [editingBold, setEditingBold] = useState(false);
  const [editingItalic, setEditingItalic] = useState(false);
  // Drag-to-move state for an extracted source block or a textEdit overlay.
  // moved=true once the cursor has travelled past the click threshold; the
  // overlay's onClick consults the trailing suppressClickRef to ignore the
  // click event that follows a real drag.
  const [blockDrag, setBlockDrag] = useState<{
    kind: "source" | "annotation";
    id: string;
    startMouseX: number;
    startMouseY: number;
    startItemX: number;
    startItemY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(
    null
  );
  const [pendingImagePosition, setPendingImagePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // For drag and resize
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [resizeHandle, setResizeHandle] = useState<
    "se" | "sw" | "ne" | "nw" | null
  >(null);
  const [eraserPath, setEraserPath] = useState<{ x: number; y: number }[]>([]);

  // For text block resizing
  const [resizingTextBlock, setResizingTextBlock] =
    useState<ExtractedTextItem | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Skip if editText mode - clicking is handled by the overlay divs
    if (currentTool === "editText") {
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === "text") {
      setTextInput({ x, y, text: "" });
    } else if (currentTool === "image") {
      setPendingImagePosition({ x, y });
      imageInputRef.current?.click();
    } else if (currentTool === "pen") {
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
    } else if (currentTool === "eraser") {
      setIsDrawing(true);
      setEraserPath([{ x, y }]);
    } else if (
      ["rectangle", "circle", "line", "arrow", "highlight"].includes(
        currentTool
      )
    ) {
      setIsDrawing(true);
      setShapeStart({ x, y });
      setShapeEnd({ x, y });
    } else if (currentTool === "select") {
      // Check if clicking on a resize handle first
      if (selectedAnnotationId) {
        const selectedAnn = pageAnnotations.find(
          (ann) => ann.id === selectedAnnotationId
        );
        if (selectedAnn && selectedAnn.type === "image") {
          const imgAnn = selectedAnn as ImageAnnotation;
          const handleSize = 8;
          const imgX = imgAnn.x;
          const imgY = imgAnn.y;
          const imgW = imgAnn.width || 0;
          const imgH = imgAnn.height || 0;

          // Check each corner handle
          if (
            x >= imgX + imgW - handleSize &&
            x <= imgX + imgW + handleSize &&
            y >= imgY + imgH - handleSize &&
            y <= imgY + imgH + handleSize
          ) {
            // Bottom-right handle
            setIsResizing(true);
            setResizeHandle("se");
            setDragStart({ x, y });
            return;
          } else if (
            x >= imgX - handleSize &&
            x <= imgX + handleSize &&
            y >= imgY + imgH - handleSize &&
            y <= imgY + imgH + handleSize
          ) {
            // Bottom-left handle
            setIsResizing(true);
            setResizeHandle("sw");
            setDragStart({ x, y });
            return;
          } else if (
            x >= imgX + imgW - handleSize &&
            x <= imgX + imgW + handleSize &&
            y >= imgY - handleSize &&
            y <= imgY + handleSize
          ) {
            // Top-right handle
            setIsResizing(true);
            setResizeHandle("ne");
            setDragStart({ x, y });
            return;
          } else if (
            x >= imgX - handleSize &&
            x <= imgX + handleSize &&
            y >= imgY - handleSize &&
            y <= imgY + handleSize
          ) {
            // Top-left handle
            setIsResizing(true);
            setResizeHandle("nw");
            setDragStart({ x, y });
            return;
          }
        }
      }

      // Find annotation at click position
      const clickedAnnotation = pageAnnotations.find((ann) => {
        if (ann.type === "text") {
          // Simple bounding box check for text
          return (
            x >= ann.x && x <= ann.x + 100 && y >= ann.y - 20 && y <= ann.y + 20
          );
        } else if (ann.type === "image") {
          // Bounding box check for images
          return (
            x >= ann.x &&
            x <= ann.x + (ann.width || 0) &&
            y >= ann.y &&
            y <= ann.y + (ann.height || 0)
          );
        } else if (ann.type === "shape") {
          return (
            x >= ann.x &&
            x <= ann.x + (ann.width || 0) &&
            y >= ann.y &&
            y <= ann.y + (ann.height || 0)
          );
        } else if (ann.type === "highlight") {
          return (
            x >= ann.x &&
            x <= ann.x + (ann.width || 0) &&
            y >= ann.y &&
            y <= ann.y + (ann.height || 0)
          );
        }
        return false;
      });

      if (clickedAnnotation) {
        // Check if Shift key is held for multi-select
        if (e.shiftKey) {
          toggleAnnotationSelection(clickedAnnotation.id);
        } else {
          setSelectedAnnotation(clickedAnnotation.id);
          // Start dragging only if not multi-selecting
          setIsDragging(true);
          setDragStart({ x, y });
        }
      } else {
        // Clicked on empty space - clear selection
        if (!e.shiftKey) {
          setSelectedAnnotation(null);
        }
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
      if (ann.type === "text") {
        // Simple bounding box check for text
        return (
          x >= ann.x && x <= ann.x + 100 && y >= ann.y - 20 && y <= ann.y + 20
        );
      }
      return false;
    });

    if (clickedAnnotation && clickedAnnotation.type === "text") {
      setEditingTextId(clickedAnnotation.id);
      const textAnn = clickedAnnotation as TextAnnotation;
      setTextInput({
        x: clickedAnnotation.x,
        y: clickedAnnotation.y,
        text: textAnn.data.text,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle text block resizing
    if (resizingTextBlock && dragStart && resizeHandle && resizePreview) {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;

      let newX = resizePreview.x;
      let newY = resizePreview.y;
      let newWidth = resizePreview.width;
      let newHeight = resizePreview.height;

      if (resizeHandle === "se") {
        // Bottom-right: increase width and height
        newWidth = Math.max(20, resizingTextBlock.width + dx);
        newHeight = Math.max(10, resizingTextBlock.height + dy);
      } else if (resizeHandle === "sw") {
        // Bottom-left: move left edge and change width/height
        newWidth = Math.max(20, resizingTextBlock.width - dx);
        newHeight = Math.max(10, resizingTextBlock.height + dy);
        newX = resizingTextBlock.x + (resizingTextBlock.width - newWidth);
      } else if (resizeHandle === "ne") {
        // Top-right: move top edge and change width/height
        newWidth = Math.max(20, resizingTextBlock.width + dx);
        newHeight = Math.max(10, resizingTextBlock.height - dy);
        newY =
          resizingTextBlock.y -
          resizingTextBlock.height +
          (resizingTextBlock.height - newHeight);
      } else if (resizeHandle === "nw") {
        // Top-left: move both edges
        newWidth = Math.max(20, resizingTextBlock.width - dx);
        newHeight = Math.max(10, resizingTextBlock.height - dy);
        newX = resizingTextBlock.x + (resizingTextBlock.width - newWidth);
        newY =
          resizingTextBlock.y -
          resizingTextBlock.height +
          (resizingTextBlock.height - newHeight);
      }

      setResizePreview({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
      return;
    }

    // Handle resizing
    if (isResizing && dragStart && selectedAnnotationId && resizeHandle) {
      const selectedAnn = pageAnnotations.find(
        (ann) => ann.id === selectedAnnotationId
      );
      if (selectedAnn && selectedAnn.type === "image") {
        const imgAnn = selectedAnn as ImageAnnotation;
        const dx = x - dragStart.x;

        let newX = imgAnn.x;
        let newY = imgAnn.y;
        let newWidth = imgAnn.width || 0;
        let newHeight = imgAnn.height || 0;

        // Calculate aspect ratio to maintain proportions
        const aspectRatio =
          (imgAnn.data.originalWidth || 1) / (imgAnn.data.originalHeight || 1);

        if (resizeHandle === "se") {
          // Bottom-right: increase width and height
          newWidth = Math.max(50, (imgAnn.width || 0) + dx);
          newHeight = newWidth / aspectRatio;
        } else if (resizeHandle === "sw") {
          // Bottom-left: move left edge and increase width
          newWidth = Math.max(50, (imgAnn.width || 0) - dx);
          newHeight = newWidth / aspectRatio;
          newX = imgAnn.x + (imgAnn.width || 0) - newWidth;
        } else if (resizeHandle === "ne") {
          // Top-right: move top edge and increase width
          newWidth = Math.max(50, (imgAnn.width || 0) + dx);
          newHeight = newWidth / aspectRatio;
          newY = imgAnn.y + (imgAnn.height || 0) - newHeight;
        } else if (resizeHandle === "nw") {
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

      const selectedAnn = pageAnnotations.find(
        (ann) => ann.id === selectedAnnotationId
      );
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

    if (currentTool === "pen") {
      setCurrentPath((prev) => [...prev, { x, y }]);
    } else if (currentTool === "eraser") {
      setEraserPath((prev) => [...prev, { x, y }]);
    } else if (
      ["rectangle", "circle", "line", "arrow", "highlight"].includes(
        currentTool
      )
    ) {
      setShapeEnd({ x, y });
    }
  };

  const handleMouseUp = () => {
    // Handle text block resize completion
    // Note: This handler is now primarily handled by the global useEffect hook
    // to ensure mouseup events are captured even when the mouse moves outside the canvas
    if (resizingTextBlock && resizePreview) {
      updateExtractedTextItem(resizingTextBlock.id, {
        x: resizePreview.x,
        y: resizePreview.y + resizePreview.height, // Note: y is at the bottom of the text block
        width: resizePreview.width,
        height: resizePreview.height,
      });

      setResizingTextBlock(null);
      setResizePreview(null);
      setResizeHandle(null);
      setDragStart(null);
      return;
    }

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

    if (currentTool === "pen" && currentPath.length > 0) {
      const annotation: Annotation = {
        id: Date.now().toString(),
        type: "drawing",
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
    } else if (currentTool === "eraser" && eraserPath.length > 0) {
      // Find and delete drawings that intersect with eraser path
      const eraserThreshold = 10; // Distance threshold for erasing
      pageAnnotations.forEach((ann) => {
        if (ann.type === "drawing") {
          // Check if any point in the drawing paths intersects with eraser path
          const shouldErase = ann.data.paths.some((path: any) =>
            path.some((point: any) =>
              eraserPath.some(
                (eraserPoint) =>
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
    } else if (
      ["rectangle", "circle", "line", "arrow"].includes(currentTool) &&
      shapeStart &&
      shapeEnd
    ) {
      const annotation: ShapeAnnotation = {
        id: Date.now().toString(),
        type: "shape",
        pageNumber,
        x: shapeStart.x,
        y: shapeStart.y,
        width: Math.abs(shapeEnd.x - shapeStart.x),
        height: Math.abs(shapeEnd.y - shapeStart.y),
        data: {
          shapeType: currentTool as "rectangle" | "circle" | "line" | "arrow",
          strokeColor: penColor,
          strokeWidth: penWidth,
          fillColor: "transparent",
          endX: shapeEnd.x,
          endY: shapeEnd.y,
        },
      };
      addAnnotation(annotation);
      setShapeStart(null);
      setShapeEnd(null);
    } else if (currentTool === "highlight" && shapeStart && shapeEnd) {
      const annotation: HighlightAnnotation = {
        id: Date.now().toString(),
        type: "highlight",
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
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const annotation: ImageAnnotation = {
          id: Date.now().toString(),
          type: "image",
          pageNumber,
          x: pendingImagePosition.x,
          y: pendingImagePosition.y,
          width: img.width > 300 ? 300 : img.width, // Default max width 300px
          height:
            img.height > 300 ? (300 / img.width) * img.height : img.height,
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
      imageInputRef.current.value = "";
    }
  };

  const handleTextSubmit = () => {
    if (textInput && textInput.text.trim()) {
      if (editingTextId) {
        // Update existing annotation
        updateAnnotation(editingTextId, {
          data: {
            ...annotations.find((a) => a.id === editingTextId)?.data,
            text: textInput.text,
          },
        });
        setEditingTextId(null);
      } else {
        // Add new annotation
        const annotation: TextAnnotation = {
          id: Date.now().toString(),
          type: "text",
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

  const handleExtractedTextSubmit = (newText: string) => {
    if (editingExtractedText && newText.trim()) {
      // Keep the edited block inside the ORIGINAL text region. Without this
      // the annotation grows wider than the source block (or the page) when
      // the user types a long line, and the overlay + saved PDF spill off
      // the canvas.
      const estimatedWidth = editingExtractedText.width;

      // Estimate how many lines the new text will occupy AFTER word-wrap
      // inside the original width. ~0.5 * fontSize is a conservative
      // average glyph advance for proportional body fonts, so we slightly
      // over-estimate the line count (safer than clipping).
      const charWidth = editingExtractedText.fontSize * 0.5;
      const charsPerLine = Math.max(
        10,
        Math.floor(editingExtractedText.width / charWidth)
      );
      const rawLines = newText.split("\n");
      let wrappedLineCount = 0;
      for (const line of rawLines) {
        wrappedLineCount +=
          line.length === 0 ? 1 : Math.ceil(line.length / charsPerLine);
      }

      const lineHeight =
        editingExtractedText.lineHeight ||
        editingExtractedText.fontSize * 1.2;
      const estimatedHeight = Math.max(
        editingExtractedText.height,
        wrappedLineCount * lineHeight
      );

      // If we're revising an already-edited block, find the existing
      // textEdit annotation so we preserve its originalText (the *real*
      // source) and update in place. Prefer the explicit re-edit id set
      // by the overlay click; fall back to the originalTextId link.
      const existing = (reeditingAnnotationId
        ? annotations.find(
            (ann) =>
              ann.id === reeditingAnnotationId && ann.type === "textEdit"
          )
        : annotations.find(
            (ann) =>
              ann.type === "textEdit" &&
              (ann as TextEditAnnotation).data.originalTextId ===
                editingExtractedText.id
          )) as TextEditAnnotation | undefined;

      const data: TextEditAnnotation["data"] = {
        originalText: existing
          ? existing.data.originalText
          : editingExtractedText.text,
        newText: newText,
        fontSize: editingExtractedText.fontSize,
        fontFamily: editingExtractedText.fontFamily,
        color: "#000000",
        originalTextId: editingExtractedText.id,
        textAlign: editingExtractedText.textAlign || "left",
        pageWidth: editingExtractedText.pageWidth,
        lineHeight: editingExtractedText.lineHeight,
        firstBaselineY: editingExtractedText.firstBaselineY,
        bold: editingBold,
        italic: editingItalic,
      };

      if (existing) {
        updateAnnotation(existing.id, {
          width: estimatedWidth,
          height: estimatedHeight,
          data,
        });
      } else {
        const annotation: TextEditAnnotation = {
          id: Date.now().toString(),
          type: "textEdit",
          pageNumber,
          x: editingExtractedText.x,
          y: editingExtractedText.y,
          width: estimatedWidth,
          height: estimatedHeight,
          data,
        };
        addAnnotation(annotation);
      }
    }
    setEditingExtractedText(null);
    setReeditingAnnotationId(null);
    setEditingBold(false);
    setEditingItalic(false);
  };

  // Handle keyboard shortcuts for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedAnnotationIds.length > 0) {
          deleteSelectedAnnotations();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAnnotationIds, deleteSelectedAnnotations]);

  // Handle global mouse events when resizing text blocks
  useEffect(() => {
    if (!resizingTextBlock) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || !dragStart || !resizeHandle || !resizePreview)
        return;

      const rect = canvasRef.current.getBoundingClientRect();
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;

      let newX = resizePreview.x;
      let newY = resizePreview.y;
      let newWidth = resizePreview.width;
      let newHeight = resizePreview.height;

      if (resizeHandle === "se") {
        newWidth = Math.max(20, resizingTextBlock.width + dx);
        newHeight = Math.max(10, resizingTextBlock.height + dy);
      } else if (resizeHandle === "sw") {
        newWidth = Math.max(20, resizingTextBlock.width - dx);
        newHeight = Math.max(10, resizingTextBlock.height + dy);
        newX = resizingTextBlock.x + (resizingTextBlock.width - newWidth);
      } else if (resizeHandle === "ne") {
        newWidth = Math.max(20, resizingTextBlock.width + dx);
        newHeight = Math.max(10, resizingTextBlock.height - dy);
        newY =
          resizingTextBlock.y -
          resizingTextBlock.height +
          (resizingTextBlock.height - newHeight);
      } else if (resizeHandle === "nw") {
        newWidth = Math.max(20, resizingTextBlock.width - dx);
        newHeight = Math.max(10, resizingTextBlock.height - dy);
        newX = resizingTextBlock.x + (resizingTextBlock.width - newWidth);
        newY =
          resizingTextBlock.y -
          resizingTextBlock.height +
          (resizingTextBlock.height - newHeight);
      }

      setResizePreview({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
    };

    const handleGlobalMouseUp = () => {
      if (resizingTextBlock && resizePreview) {
        updateExtractedTextItem(resizingTextBlock.id, {
          x: resizePreview.x,
          y: resizePreview.y + resizePreview.height,
          width: resizePreview.width,
          height: resizePreview.height,
        });
      }

      setResizingTextBlock(null);
      setResizePreview(null);
      setResizeHandle(null);
      setDragStart(null);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [
    resizingTextBlock,
    dragStart,
    resizeHandle,
    resizePreview,
    scale,
    updateExtractedTextItem,
  ]);

  // Drag-to-move for source / textEdit overlays. The active drag is tracked
  // in blockDrag; this effect owns the window mousemove/up listeners while
  // a drag is in progress. We update the store on every frame so the
  // overlay tracks the cursor live.
  useEffect(() => {
    if (!blockDrag) return;
    const DRAG_THRESHOLD = 4; // px in screen space before it counts as a drag

    const onMove = (e: MouseEvent) => {
      const dxPx = e.clientX - blockDrag.startMouseX;
      const dyPx = e.clientY - blockDrag.startMouseY;
      if (
        !blockDrag.moved &&
        Math.abs(dxPx) + Math.abs(dyPx) < DRAG_THRESHOLD
      ) {
        return;
      }
      const newX = blockDrag.startItemX + dxPx / scale;
      const newY = blockDrag.startItemY + dyPx / scale;
      if (blockDrag.kind === "source") {
        updateExtractedTextItem(blockDrag.id, { x: newX, y: newY });
      } else {
        updateAnnotation(blockDrag.id, { x: newX, y: newY });
      }
      if (!blockDrag.moved) {
        // Latch the moved flag so the trailing click is suppressed.
        setBlockDrag({ ...blockDrag, moved: true });
      }
    };

    const onUp = () => {
      if (blockDrag.moved) suppressClickRef.current = true;
      setBlockDrag(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [blockDrag, scale, updateExtractedTextItem, updateAnnotation]);

  const pageAnnotations = annotations.filter(
    (ann) => ann.pageNumber === pageNumber
  );

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
        style={{
          pointerEvents: "auto",
          cursor: currentTool === "select" ? "default" : "crosshair",
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Render current drawing path */}
          {currentPath.length > 0 && (
            <path
              d={`M ${currentPath.map((p) => `${p.x},${p.y}`).join(" L ")}`}
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
              d={`M ${eraserPath.map((p) => `${p.x},${p.y}`).join(" L ")}`}
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
              {currentTool === "rectangle" && (
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
              {currentTool === "circle" && (
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
              {currentTool === "line" && (
                <line
                  x1={shapeStart.x}
                  y1={shapeStart.y}
                  x2={shapeEnd.x}
                  y2={shapeEnd.y}
                  stroke={penColor}
                  strokeWidth={penWidth}
                />
              )}
              {currentTool === "arrow" && (
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
                    points={`${shapeEnd.x},${shapeEnd.y} ${shapeEnd.x - 10},${
                      shapeEnd.y - 5
                    } ${shapeEnd.x - 10},${shapeEnd.y + 5}`}
                    fill={penColor}
                    transform={`rotate(${
                      (Math.atan2(
                        shapeEnd.y - shapeStart.y,
                        shapeEnd.x - shapeStart.x
                      ) *
                        180) /
                      Math.PI
                    } ${shapeEnd.x} ${shapeEnd.y})`}
                  />
                </g>
              )}
              {currentTool === "highlight" && (
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
            if (annotation.type === "drawing") {
              return annotation.data.paths.map((path: any, idx: number) => (
                <path
                  key={`${annotation.id}-${idx}`}
                  d={`M ${path.map((p: any) => `${p.x},${p.y}`).join(" L ")}`}
                  stroke={annotation.data.color}
                  strokeWidth={annotation.data.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ));
            } else if (annotation.type === "shape") {
              const shape = annotation as ShapeAnnotation;
              const isSelected = selectedAnnotationIds.includes(annotation.id);
              if (shape.data.shapeType === "rectangle") {
                return (
                  <g key={annotation.id}>
                    <rect
                      x={annotation.x}
                      y={annotation.y}
                      width={annotation.width}
                      height={annotation.height}
                      stroke={shape.data.strokeColor}
                      strokeWidth={shape.data.strokeWidth}
                      fill={shape.data.fillColor || "none"}
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
              } else if (shape.data.shapeType === "circle") {
                return (
                  <g key={annotation.id}>
                    <ellipse
                      cx={annotation.x + (annotation.width || 0) / 2}
                      cy={annotation.y + (annotation.height || 0) / 2}
                      rx={(annotation.width || 0) / 2}
                      ry={(annotation.height || 0) / 2}
                      stroke={shape.data.strokeColor}
                      strokeWidth={shape.data.strokeWidth}
                      fill={shape.data.fillColor || "none"}
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
              } else if (shape.data.shapeType === "line") {
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
              } else if (shape.data.shapeType === "arrow") {
                const angle =
                  (Math.atan2(
                    (shape.data.endY || 0) - annotation.y,
                    (shape.data.endX || 0) - annotation.x
                  ) *
                    180) /
                  Math.PI;
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
                      points={`${shape.data.endX},${shape.data.endY} ${
                        (shape.data.endX || 0) - 10
                      },${(shape.data.endY || 0) - 5} ${
                        (shape.data.endX || 0) - 10
                      },${(shape.data.endY || 0) + 5}`}
                      fill={shape.data.strokeColor}
                      transform={`rotate(${angle} ${shape.data.endX} ${shape.data.endY})`}
                    />
                  </g>
                );
              }
            } else if (annotation.type === "highlight") {
              const highlight = annotation as HighlightAnnotation;
              const isSelected = selectedAnnotationIds.includes(annotation.id);
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
          if (annotation.type === "text" && annotation.id !== editingTextId) {
            const textAnn = annotation as TextAnnotation;
            const isSelected = selectedAnnotationIds.includes(annotation.id);
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
                  fontWeight: textAnn.data.bold ? "bold" : "normal",
                  fontStyle: textAnn.data.italic ? "italic" : "normal",
                  textDecoration: textAnn.data.underline ? "underline" : "none",
                  pointerEvents: "none",
                  border: isSelected ? "2px dashed #3B82F6" : "none",
                  padding: isSelected ? "2px" : "0",
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
          if (annotation.type === "image") {
            const imgAnn = annotation as ImageAnnotation;
            const isSelected = selectedAnnotationIds.includes(annotation.id);
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
                    border: isSelected ? "2px solid #3B82F6" : "none",
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
                        cursor: "nw-resize",
                        pointerEvents: "none",
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
                        cursor: "ne-resize",
                        pointerEvents: "none",
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
                        cursor: "sw-resize",
                        pointerEvents: "none",
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
                        cursor: "se-resize",
                        pointerEvents: "none",
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

      {/* Render extracted text with dotted borders in editText mode */}
      {currentTool === "editText" &&
        extractedText
          .filter((t) => t.pageNumber === pageNumber)
          .map((textItem) => {
            // Check if this text has been edited by matching the originalTextId
            const editAnnotation = pageAnnotations.find(
              (ann) =>
                ann.type === "textEdit" &&
                (ann as TextEditAnnotation).data.originalTextId === textItem.id
            ) as TextEditAnnotation | undefined;

            // Don't show original text if it has been edited - the edited version replaces it
            if (editAnnotation) return null;

            return (
              <div
                key={textItem.id}
                className="absolute hover:bg-blue-50 hover:bg-opacity-20 transition-colors group"
                style={{
                  left: textItem.x * scale,
                  top: (textItem.y - textItem.height) * scale,
                  width: textItem.width * scale,
                  height: textItem.height * scale,
                  pointerEvents: "auto",
                  zIndex: 10,
                  border: "2px dashed #3B82F6",
                  borderRadius: "2px",
                  boxSizing: "border-box",
                  cursor: blockDrag?.id === textItem.id ? "grabbing" : "grab",
                }}
                onMouseDown={(e) => {
                  // Only the body initiates a drag — the resize handles are
                  // children that stopPropagation in their own onMouseDown.
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  setBlockDrag({
                    kind: "source",
                    id: textItem.id,
                    startMouseX: e.clientX,
                    startMouseY: e.clientY,
                    startItemX: textItem.x,
                    startItemY: textItem.y,
                    moved: false,
                  });
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return; // user just dragged — don't open the editor
                  }
                  setEditingExtractedText(textItem);
                  setEditingBold(!!textItem.bold);
                  setEditingItalic(!!textItem.italic);
                }}
                title="Drag to move · click to edit"
              >
                {/* Show resize handles on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Corner handles - now functional */}
                  {/* Top-left handle */}
                  <div
                    className="absolute bg-blue-500 rounded-full border-2 border-white cursor-nwse-resize hover:bg-blue-600 hover:scale-125 transition-all"
                    style={{
                      width: "12px",
                      height: "12px",
                      left: "-6px",
                      top: "-6px",
                      pointerEvents: "auto",
                      zIndex: 20,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingTextBlock(textItem);
                      setResizeHandle("nw");
                      setDragStart({ x: e.clientX, y: e.clientY });
                      setResizePreview({
                        x: textItem.x,
                        y: textItem.y - textItem.height,
                        width: textItem.width,
                        height: textItem.height,
                      });
                    }}
                  />
                  {/* Top-right handle */}
                  <div
                    className="absolute bg-blue-500 rounded-full border-2 border-white cursor-nesw-resize hover:bg-blue-600 hover:scale-125 transition-all"
                    style={{
                      width: "12px",
                      height: "12px",
                      right: "-6px",
                      top: "-6px",
                      pointerEvents: "auto",
                      zIndex: 20,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingTextBlock(textItem);
                      setResizeHandle("ne");
                      setDragStart({ x: e.clientX, y: e.clientY });
                      setResizePreview({
                        x: textItem.x,
                        y: textItem.y - textItem.height,
                        width: textItem.width,
                        height: textItem.height,
                      });
                    }}
                  />
                  {/* Bottom-left handle */}
                  <div
                    className="absolute bg-blue-500 rounded-full border-2 border-white cursor-nesw-resize hover:bg-blue-600 hover:scale-125 transition-all"
                    style={{
                      width: "12px",
                      height: "12px",
                      left: "-6px",
                      bottom: "-6px",
                      pointerEvents: "auto",
                      zIndex: 20,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingTextBlock(textItem);
                      setResizeHandle("sw");
                      setDragStart({ x: e.clientX, y: e.clientY });
                      setResizePreview({
                        x: textItem.x,
                        y: textItem.y - textItem.height,
                        width: textItem.width,
                        height: textItem.height,
                      });
                    }}
                  />
                  {/* Bottom-right handle */}
                  <div
                    className="absolute bg-blue-500 rounded-full border-2 border-white cursor-nwse-resize hover:bg-blue-600 hover:scale-125 transition-all"
                    style={{
                      width: "12px",
                      height: "12px",
                      right: "-6px",
                      bottom: "-6px",
                      pointerEvents: "auto",
                      zIndex: 20,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingTextBlock(textItem);
                      setResizeHandle("se");
                      setDragStart({ x: e.clientX, y: e.clientY });
                      setResizePreview({
                        x: textItem.x,
                        y: textItem.y - textItem.height,
                        width: textItem.width,
                        height: textItem.height,
                      });
                    }}
                  />
                </div>
              </div>
            );
          })}

      {/* Render text edit annotations with dotted border when in edit mode */}
      {pageAnnotations.map((annotation) => {
        if (annotation.type === "textEdit") {
          const textEdit = annotation as TextEditAnnotation;
          const showBorder = currentTool === "editText";
          const textAlign = textEdit.data.textAlign || "left";

          const coverWidth = Math.max(
            annotation.width! + 10,
            annotation.width! * 1.1
          );
          const coverHeight = Math.max(
            annotation.height! + 4,
            annotation.height! * 1.1
          );

          return (
            <div
              key={annotation.id}
              className="absolute"
              style={{
                left: (annotation.x - 5) * scale,
                top: (annotation.y - annotation.height! - 2) * scale,
                width: coverWidth * scale,
                // Fixed height (NOT minHeight) — otherwise long edited text
                // grows the div downward and the pointerEvents:auto region
                // covers + swallows clicks on neighbouring text blocks, so
                // the user can never edit anything else again.
                height: coverHeight * scale,
                overflow: "hidden",
                backgroundColor: "white",
                fontSize: textEdit.data.fontSize * scale,
                fontFamily: textEdit.data.fontFamily,
                fontWeight: textEdit.data.bold ? "bold" : "normal",
                fontStyle: textEdit.data.italic ? "italic" : "normal",
                color: textEdit.data.color,
                pointerEvents: showBorder ? "auto" : "none",
                cursor: showBorder
                  ? blockDrag?.id === annotation.id
                    ? "grabbing"
                    : "grab"
                  : "default",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: "1.2",
                border: showBorder ? "2px dashed #10B981" : "none",
                borderRadius: "2px",
                padding: "2px 5px",
                textAlign: textAlign,
                zIndex: 5,
              }}
              title={
                showBorder ? "Drag to move · click to edit" : undefined
              }
              onMouseDown={(e) => {
                if (currentTool !== "editText") return;
                if (e.button !== 0) return;
                e.stopPropagation();
                setBlockDrag({
                  kind: "annotation",
                  id: annotation.id,
                  startMouseX: e.clientX,
                  startMouseY: e.clientY,
                  startItemX: annotation.x,
                  startItemY: annotation.y,
                  moved: false,
                });
              }}
              onClick={(e) => {
                if (currentTool !== "editText") return;
                e.stopPropagation();
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return; // user just dragged — don't open the editor
                }
                // Re-open the editor on the source block, pre-populated with
                // the current edited text. The submit handler will detect
                // the existing annotation and update it in place.
                const source = extractedText.find(
                  (t) => t.id === textEdit.data.originalTextId
                );
                if (!source) return;
                setReeditingAnnotationId(annotation.id);
                setEditingExtractedText({
                  ...source,
                  text: textEdit.data.newText,
                });
                // Prefer the saved annotation flags; fall back to the source.
                setEditingBold(textEdit.data.bold ?? !!source.bold);
                setEditingItalic(textEdit.data.italic ?? !!source.italic);
              }}
            >
              {textEdit.data.newText}
            </div>
          );
        }
        return null;
      })}

      {/* Hidden file input for image upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: "none" }}
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
            onChange={(e) =>
              setTextInput({ ...textInput, text: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleTextSubmit();
              } else if (e.key === "Escape") {
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
              minWidth: "200px",
            }}
            placeholder="Type text..."
          />
        </div>
      )}

      {/* Extracted text editing overlay with expandable boundaries */}
      {editingExtractedText && (
        <div
          className="absolute bg-white shadow-2xl"
          style={{
            left: editingExtractedText.x * scale,
            top: (editingExtractedText.y - editingExtractedText.height) * scale,
            zIndex: 1000,
            border: "2px dashed #3B82F6",
            borderRadius: "4px",
            minWidth: `${editingExtractedText.width * scale}px`,
          }}
        >
          {/* Formatting toolbar. onMouseDown preventDefault keeps focus on
              the textarea so its onBlur (auto-submit) doesn't fire when the
              user clicks B or I. */}
          <div className="flex items-center gap-1 px-2 pt-2 border-b border-gray-200">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setEditingBold((v) => !v);
              }}
              className={`w-7 h-7 rounded text-sm font-bold border transition-colors ${
                editingBold
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setEditingItalic((v) => !v);
              }}
              className={`w-7 h-7 rounded text-sm italic border transition-colors ${
                editingItalic
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
              title="Italic"
            >
              I
            </button>
          </div>
          {/* Expandable textarea container */}
          <div className="relative p-2">
            <textarea
              autoFocus
              defaultValue={editingExtractedText.text}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleExtractedTextSubmit(e.currentTarget.value);
                } else if (e.key === "Escape") {
                  setEditingExtractedText(null);
                  setReeditingAnnotationId(null);
                  setEditingBold(false);
                  setEditingItalic(false);
                }
              }}
              onBlur={(e) => handleExtractedTextSubmit(e.currentTarget.value)}
              className="outline-none px-2 py-1 resize border border-gray-300 rounded w-full"
              style={{
                fontSize: editingExtractedText.fontSize * scale,
                fontFamily: editingExtractedText.fontFamily,
                fontWeight: editingBold ? "bold" : "normal",
                fontStyle: editingItalic ? "italic" : "normal",
                color: "#000000",
                minWidth: `${editingExtractedText.width * scale}px`,
                minHeight: `${Math.max(editingExtractedText.height * scale, 60)}px`,
                lineHeight: "1.2",
              }}
              rows={Math.max(
                3,
                editingExtractedText.text.split("\n").length + 1
              )}
            />
            {/* Corner resize handles */}
            <div
              className="absolute bg-blue-500 rounded-full border-2 border-white"
              style={{
                width: "12px",
                height: "12px",
                left: "-6px",
                top: "-6px",
                pointerEvents: "none",
              }}
            />
            <div
              className="absolute bg-blue-500 rounded-full border-2 border-white"
              style={{
                width: "12px",
                height: "12px",
                right: "-6px",
                top: "-6px",
                pointerEvents: "none",
              }}
            />
            <div
              className="absolute bg-blue-500 rounded-full border-2 border-white"
              style={{
                width: "12px",
                height: "12px",
                left: "-6px",
                bottom: "-6px",
                pointerEvents: "none",
              }}
            />
            <div
              className="absolute bg-blue-500 rounded-full border-2 border-white"
              style={{
                width: "12px",
                height: "12px",
                right: "-6px",
                bottom: "-6px",
                pointerEvents: "none",
              }}
            />
          </div>
          {/* Help text */}
          <div className="px-3 pb-2 text-xs text-gray-600 bg-gray-50 rounded-b border-t border-gray-200">
            <span className="font-semibold">Ctrl+Enter</span> to save ·{" "}
            <span className="font-semibold">Esc</span> to cancel ·{" "}
            <span className="font-semibold">B</span>/
            <span className="font-semibold">I</span> for bold/italic
          </div>
        </div>
      )}

      {/* Resize preview overlay */}
      {resizePreview && resizingTextBlock && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: resizePreview.x * scale,
            top: resizePreview.y * scale,
            width: resizePreview.width * scale,
            height: resizePreview.height * scale,
            border: "3px dashed #3B82F6",
            borderRadius: "4px",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            zIndex: 999,
          }}
        >
          {/* Show dimensions in the preview */}
          <div
            className="absolute bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg"
            style={{
              bottom: "-30px",
              left: "50%",
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
            }}
          >
            {Math.round(resizePreview.width)} ×{" "}
            {Math.round(resizePreview.height)}
          </div>
        </div>
      )}
    </>
  );
};

export default PDFCanvas;
