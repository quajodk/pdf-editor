import React, { useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const {
    searchQuery,
    searchResults,
    currentSearchIndex,
    isSearchOpen,
    setSearchQuery,
    setIsSearchOpen,
    nextSearchResult,
    previousSearchResult,
    clearSearch,
  } = useEditorStore();

  useEffect(() => {
    // Trigger search when query changes
    if (searchQuery) {
      onSearch(searchQuery);
    }
  }, [searchQuery, onSearch]);

  const handleClose = () => {
    clearSearch();
    setIsSearchOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        previousSearchResult();
      } else {
        nextSearchResult();
      }
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isSearchOpen) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-white border-b border-gray-300 px-4 py-2 shadow-sm">
      <div className="flex items-center gap-2 flex-1">
        <label className="text-sm text-gray-600">Find:</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search text in PDF..."
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
          aria-label="Search text in PDF"
        />

        {searchResults.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {currentSearchIndex + 1} of {searchResults.length}
            </span>

            <button
              onClick={previousSearchResult}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              title="Previous result (Shift+Enter)"
              aria-label="Go to previous search result"
            >
              ↑
            </button>

            <button
              onClick={nextSearchResult}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              title="Next result (Enter)"
              aria-label="Go to next search result"
            >
              ↓
            </button>
          </div>
        )}

        {searchQuery && searchResults.length === 0 && (
          <span className="text-sm text-gray-500">No results found</span>
        )}
      </div>

      <button
        onClick={handleClose}
        className="px-2 py-1 text-gray-500 hover:text-gray-700"
        title="Close search (Esc)"
        aria-label="Close search"
      >
        ✕
      </button>
    </div>
  );
};

export default SearchBar;
