import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { useEditorStore } from '../store/useEditorStore';
import { TextAnnotation, DrawingAnnotation, ShapeAnnotation, HighlightAnnotation, ImageAnnotation } from '../types';
import Toolbar from './Toolbar';
import PDFCanvas from './PDFCanvas';
import PageThumbnails from './PageThumbnails';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker - use jsdelivr which supports newer versions
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFEditorProps {
  file: File;
  onClose: () => void;
}

const PDFEditor: React.FC<PDFEditorProps> = ({ file, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<File>(file);
  const { currentPage, setCurrentPage, setTotalPages, zoom, setZoom, annotations, undo, redo } = useEditorStore();

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setTotalPages(numPages);
    setCurrentPage(1);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    alert('Failed to load PDF. Please try another file.');
    setLoading(false);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setZoom(zoom + 0.1);
  };

  const handleZoomOut = () => {
    setZoom(zoom - 0.1);
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 0, g: 0, b: 0 };
  };

  const handleDownload = async () => {
    if (annotations.length === 0) {
      // If no annotations, just download the current file
      const url = URL.createObjectURL(currentFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentFile.name.replace('.pdf', '_edited.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    setDownloading(true);
    try {
      // Load the current PDF
      const arrayBuffer = await currentFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Render annotations onto each page
      for (const annotation of annotations) {
        const pageIndex = annotation.pageNumber - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;

        const page = pages[pageIndex];
        const { height: pageHeight } = page.getSize();

        if (annotation.type === 'text') {
          const textAnn = annotation as TextAnnotation;
          const color = hexToRgb(textAnn.data.color);

          try {
            page.drawText(textAnn.data.text, {
              x: textAnn.x,
              y: pageHeight - textAnn.y - textAnn.data.fontSize,
              size: textAnn.data.fontSize,
              color: rgb(color.r, color.g, color.b),
            });
          } catch (error) {
            console.error('Error drawing text annotation:', error);
          }
        } else if (annotation.type === 'shape') {
          const shapeAnn = annotation as ShapeAnnotation;
          const color = hexToRgb(shapeAnn.data.strokeColor);

          if (shapeAnn.data.shapeType === 'rectangle') {
            page.drawRectangle({
              x: shapeAnn.x,
              y: pageHeight - shapeAnn.y - (shapeAnn.height || 0),
              width: shapeAnn.width || 0,
              height: shapeAnn.height || 0,
              borderColor: rgb(color.r, color.g, color.b),
              borderWidth: shapeAnn.data.strokeWidth,
            });
          } else if (shapeAnn.data.shapeType === 'circle') {
            const centerX = shapeAnn.x + (shapeAnn.width || 0) / 2;
            const centerY = pageHeight - shapeAnn.y - (shapeAnn.height || 0) / 2;
            const radiusX = (shapeAnn.width || 0) / 2;
            const radiusY = (shapeAnn.height || 0) / 2;

            page.drawEllipse({
              x: centerX,
              y: centerY,
              xScale: radiusX,
              yScale: radiusY,
              borderColor: rgb(color.r, color.g, color.b),
              borderWidth: shapeAnn.data.strokeWidth,
            });
          } else if (shapeAnn.data.shapeType === 'line' || shapeAnn.data.shapeType === 'arrow') {
            page.drawLine({
              start: { x: shapeAnn.x, y: pageHeight - shapeAnn.y },
              end: { x: shapeAnn.data.endX || shapeAnn.x, y: pageHeight - (shapeAnn.data.endY || shapeAnn.y) },
              thickness: shapeAnn.data.strokeWidth,
              color: rgb(color.r, color.g, color.b),
            });
            // Note: Arrow heads are not rendered in pdf-lib (limitation)
          }
        } else if (annotation.type === 'highlight') {
          const highlightAnn = annotation as HighlightAnnotation;
          const color = hexToRgb(highlightAnn.data.color);

          page.drawRectangle({
            x: highlightAnn.x,
            y: pageHeight - highlightAnn.y - (highlightAnn.height || 0),
            width: highlightAnn.width || 0,
            height: highlightAnn.height || 0,
            color: rgb(color.r, color.g, color.b),
            opacity: highlightAnn.data.opacity,
          });
        } else if (annotation.type === 'drawing') {
          const drawingAnn = annotation as DrawingAnnotation;
          const color = hexToRgb(drawingAnn.data.color);

          // Draw each path as a series of connected lines
          for (const path of drawingAnn.data.paths) {
            for (let i = 0; i < path.length - 1; i++) {
              const point1 = path[i];
              const point2 = path[i + 1];
              page.drawLine({
                start: { x: point1.x, y: pageHeight - point1.y },
                end: { x: point2.x, y: pageHeight - point2.y },
                thickness: drawingAnn.data.width,
                color: rgb(color.r, color.g, color.b),
              });
            }
          }
        } else if (annotation.type === 'image') {
          const imageAnn = annotation as ImageAnnotation;

          try {
            // Fetch the image data from the base64 data URL
            const imageData = imageAnn.data.src;
            let embeddedImage;

            if (imageData.startsWith('data:image/png')) {
              const pngImageBytes = await fetch(imageData).then(res => res.arrayBuffer());
              embeddedImage = await pdfDoc.embedPng(pngImageBytes);
            } else if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
              const jpgImageBytes = await fetch(imageData).then(res => res.arrayBuffer());
              embeddedImage = await pdfDoc.embedJpg(jpgImageBytes);
            } else {
              // Try PNG as default
              const pngImageBytes = await fetch(imageData).then(res => res.arrayBuffer());
              embeddedImage = await pdfDoc.embedPng(pngImageBytes);
            }

            page.drawImage(embeddedImage, {
              x: imageAnn.x,
              y: pageHeight - imageAnn.y - (imageAnn.height || 0),
              width: imageAnn.width || 100,
              height: imageAnn.height || 100,
            });
          } catch (error) {
            console.error('Error drawing image annotation:', error);
          }
        }
      }

      // Save and download the modified PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentFile.name.replace('.pdf', '_edited.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF with annotations. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePageDelete = async (pageNumber: number) => {
    if (numPages <= 1) {
      alert('Cannot delete the only page in the document.');
      return;
    }

    setLoading(true);
    try {
      // Load the PDF
      const arrayBuffer = await currentFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Remove the page (pageNumber is 1-indexed, but pdf-lib uses 0-indexed)
      pdfDoc.removePage(pageNumber - 1);

      // Save the modified PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const newFile = new File([blob], currentFile.name, { type: 'application/pdf' });

      // Update state
      setCurrentFile(newFile);

      // Filter out annotations from the deleted page
      const { annotations: allAnnotations } = useEditorStore.getState();
      const filteredAnnotations = allAnnotations.filter(ann => ann.pageNumber !== pageNumber);

      // Adjust page numbers for annotations after the deleted page
      const adjustedAnnotations = filteredAnnotations.map(ann => {
        if (ann.pageNumber > pageNumber) {
          return { ...ann, pageNumber: ann.pageNumber - 1 };
        }
        return ann;
      });

      // Update annotations in store (this will add to history)
      useEditorStore.setState({
        annotations: adjustedAnnotations,
        history: [...useEditorStore.getState().history, adjustedAnnotations],
        historyIndex: useEditorStore.getState().historyIndex + 1,
      });

      // Adjust current page if necessary
      if (currentPage > numPages - 1) {
        setCurrentPage(numPages - 1);
      } else if (currentPage >= pageNumber && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }

      // Force reload by updating numPages
      setNumPages(numPages - 1);
      setTotalPages(numPages - 1);
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Failed to delete page. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageRotate = async (pageNumber: number) => {
    setLoading(true);
    try {
      // Load the PDF
      const arrayBuffer = await currentFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Get the page (pageNumber is 1-indexed, but pdf-lib uses 0-indexed)
      const page = pages[pageNumber - 1];

      // Rotate the page 90 degrees clockwise
      const currentRotation = page.getRotation().angle;
      const newRotation = (currentRotation + 90) % 360;
      page.setRotation(degrees(newRotation));

      // Save the modified PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const newFile = new File([blob], currentFile.name, { type: 'application/pdf' });

      // Update state to force re-render
      setCurrentFile(newFile);

      // Force a re-render by toggling a state variable
      setLoading(false);

      // Small timeout to ensure the Document component re-renders
      setTimeout(() => {
        setNumPages(numPages); // This triggers re-render
      }, 100);
    } catch (error) {
      console.error('Error rotating page:', error);
      alert('Failed to rotate page. Please try again.');
      setLoading(false);
    }
  };

  const handlePageReorder = async (fromPage: number, toPage: number) => {
    setLoading(true);
    try {
      // Load the PDF
      const arrayBuffer = await currentFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Create a new PDF document
      const newPdfDoc = await PDFDocument.create();

      // Calculate the new order of pages
      const pageOrder: number[] = [];
      for (let i = 1; i <= numPages; i++) {
        pageOrder.push(i);
      }

      // Remove the dragged page from its original position
      pageOrder.splice(fromPage - 1, 1);
      // Insert it at the target position
      pageOrder.splice(toPage - 1, 0, fromPage);

      // Copy pages in the new order
      for (const pageNum of pageOrder) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1]);
        newPdfDoc.addPage(copiedPage);
      }

      // Save the reordered PDF
      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const newFile = new File([blob], currentFile.name, { type: 'application/pdf' });

      // Update state
      setCurrentFile(newFile);

      // Update annotations with new page numbers
      const { annotations: allAnnotations } = useEditorStore.getState();
      const reorderedAnnotations = allAnnotations.map(ann => {
        // Find the new page number for this annotation
        const oldPageNum = ann.pageNumber;
        const newPageNum = pageOrder.indexOf(oldPageNum) + 1;
        return { ...ann, pageNumber: newPageNum };
      });

      // Update annotations in store
      useEditorStore.setState({
        annotations: reorderedAnnotations,
        history: [...useEditorStore.getState().history, reorderedAnnotations],
        historyIndex: useEditorStore.getState().historyIndex + 1,
      });

      // Update current page if the current page was moved
      if (currentPage === fromPage) {
        setCurrentPage(toPage);
      } else {
        // Adjust current page if it was affected by the move
        const newCurrentPage = pageOrder.indexOf(currentPage) + 1;
        setCurrentPage(newCurrentPage);
      }

      // Force re-render
      setLoading(false);
      setTimeout(() => {
        setNumPages(numPages); // This triggers re-render
      }, 100);
    } catch (error) {
      console.error('Error reordering pages:', error);
      alert('Failed to reorder pages. Please try again.');
      setLoading(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if target is an input element to avoid conflicts
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl/Cmd + Y OR Ctrl/Cmd + Shift + Z: Redo
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }

      // Ctrl/Cmd + S: Save
      else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleDownload();
      }

      // Arrow keys: Page navigation
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevPage();
      }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextPage();
      }

      // + or =: Zoom in
      else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      }

      // -: Zoom out
      else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, currentPage, numPages, zoom]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Toolbar
        onClose={onClose}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onDownload={handleDownload}
        downloading={downloading}
        zoom={zoom}
        currentPage={currentPage}
        totalPages={numPages}
        onPageChange={setCurrentPage}
      />

      <PageThumbnails
        file={currentFile}
        numPages={numPages}
        currentPage={currentPage}
        onPageClick={setCurrentPage}
        onPageDelete={handlePageDelete}
        onPageRotate={handlePageRotate}
        onPageReorder={handlePageReorder}
        isOpen={thumbnailsOpen}
        onToggle={() => setThumbnailsOpen(!thumbnailsOpen)}
      />

      <div className="flex-1 overflow-auto bg-gray-200 p-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <div className="relative bg-white shadow-lg">
            <Document
              file={currentFile}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={zoom}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>

            <PDFCanvas pageNumber={currentPage} scale={zoom} />
          </div>
        </div>
      </div>

      <div className="bg-white border-t px-4 py-2 flex items-center justify-center gap-4">
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
          title="Go to previous page (Left arrow key)"
        >
          Previous
        </button>

        <span className="text-sm text-gray-700" title="Current page number and total pages">
          Page {currentPage} of {numPages}
        </span>

        <button
          onClick={handleNextPage}
          disabled={currentPage >= numPages}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
          title="Go to next page (Right arrow key)"
        >
          Next
        </button>

        <div className="ml-4 flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            -
          </button>
          <span className="text-sm text-gray-700 w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFEditor;
