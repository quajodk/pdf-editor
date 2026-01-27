import React from 'react';
import { Document, Page } from 'react-pdf';

interface PageThumbnailsProps {
  file: File;
  numPages: number;
  currentPage: number;
  onPageClick: (pageNumber: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const PageThumbnails: React.FC<PageThumbnailsProps> = ({
  file,
  numPages,
  currentPage,
  onPageClick,
  isOpen,
  onToggle,
}) => {
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
                    onClick={() => onPageClick(pageNumber)}
                    className={`cursor-pointer border-2 rounded overflow-hidden transition-all hover:border-blue-500 ${
                      currentPage === pageNumber
                        ? 'border-blue-600 ring-2 ring-blue-400 shadow-md'
                        : 'border-gray-300'
                    }`}
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
