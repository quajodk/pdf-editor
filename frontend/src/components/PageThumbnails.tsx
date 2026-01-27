import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';

interface PageThumbnailsProps {
  file: File;
  numPages: number;
  currentPage: number;
  onPageClick: (pageNumber: number) => void;
  onPageDelete: (pageNumber: number) => void;
  onPageRotate: (pageNumber: number) => void;
  onPageReorder: (fromPage: number, toPage: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const PageThumbnails: React.FC<PageThumbnailsProps> = ({
  file,
  numPages,
  currentPage,
  onPageClick,
  onPageDelete,
  onPageRotate,
  onPageReorder,
  isOpen,
  onToggle,
}) => {
  const [draggedPage, setDraggedPage] = useState<number | null>(null);
  const [dragOverPage, setDragOverPage] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, pageNumber: number) => {
    setDraggedPage(pageNumber);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, pageNumber: number) => {
    e.preventDefault();
    if (draggedPage !== pageNumber) {
      setDragOverPage(pageNumber);
    }
  };

  const handleDragLeave = () => {
    setDragOverPage(null);
  };

  const handleDrop = (e: React.DragEvent, targetPage: number) => {
    e.preventDefault();
    if (draggedPage !== null && draggedPage !== targetPage) {
      onPageReorder(draggedPage, targetPage);
    }
    setDraggedPage(null);
    setDragOverPage(null);
  };

  const handleDragEnd = () => {
    setDraggedPage(null);
    setDragOverPage(null);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed left-4 top-20 z-20 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        title={isOpen ? 'Hide Thumbnails' : 'Show Thumbnails'}
      >
        {isOpen ? '◀ Hide' : '▶ Pages'}
      </button>

      {/* Sidebar */}
      {isOpen && (
        <div className="fixed left-0 top-16 bottom-0 w-48 bg-gray-100 border-r border-gray-300 shadow-lg overflow-y-auto z-10">
          <div className="p-2 bg-gray-200 border-b border-gray-300 font-semibold text-sm text-gray-700">
            Pages ({numPages})
          </div>

          <div className="p-2 space-y-2">
            <Document file={file} loading="">
              {Array.from({ length: numPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <div
                    key={pageNumber}
                    draggable
                    onDragStart={(e) => handleDragStart(e, pageNumber)}
                    onDragOver={(e) => handleDragOver(e, pageNumber)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, pageNumber)}
                    onDragEnd={handleDragEnd}
                    className={`border-2 rounded overflow-hidden transition-all hover:border-blue-500 relative cursor-move ${
                      currentPage === pageNumber
                        ? 'border-blue-600 ring-2 ring-blue-400 shadow-md'
                        : 'border-gray-300'
                    } ${draggedPage === pageNumber ? 'opacity-50' : ''} ${
                      dragOverPage === pageNumber ? 'ring-4 ring-green-500 transform scale-105' : ''
                    }`}
                  >
                    <div
                      onClick={() => onPageClick(pageNumber)}
                      className="cursor-pointer"
                      title={`Go to page ${pageNumber}`}
                    >
                      <div className="relative">
                        <Page
                          pageNumber={pageNumber}
                          width={160}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                        <div
                          className={`absolute bottom-0 left-0 right-0 text-center py-1 text-xs font-medium ${
                            currentPage === pageNumber
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          Page {pageNumber}
                        </div>
                      </div>
                    </div>
                    {/* Rotate Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPageRotate(pageNumber);
                      }}
                      className="absolute top-1 left-1 bg-blue-600 hover:bg-blue-700 text-white rounded p-1 text-xs font-bold shadow-md transition-colors"
                      title={`Rotate page ${pageNumber} 90° clockwise`}
                    >
                      ↻
                    </button>
                    {/* Delete Button */}
                    {numPages > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete page ${pageNumber}? This cannot be undone.`)) {
                            onPageDelete(pageNumber);
                          }
                        }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded p-1 text-xs font-bold shadow-md transition-colors"
                        title={`Delete page ${pageNumber}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              )}
            </Document>
          </div>
        </div>
      )}
    </>
  );
};

export default PageThumbnails;
