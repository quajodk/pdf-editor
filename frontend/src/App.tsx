import React, { useState } from 'react';
import './App.css';
import PDFEditor from './components/PDFEditor';

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const handleFileUpload = (file: File) => {
    setPdfFile(file);
  };

  return (
    <div className="App min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">PDF Editor</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!pdfFile ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="border-4 border-dashed border-gray-300 rounded-lg p-12 bg-white hover:border-blue-500 transition-colors">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload a PDF file
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      or drag and drop
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".pdf,application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.type === 'application/pdf') {
                          handleFileUpload(file);
                        } else {
                          alert('Please select a valid PDF file');
                        }
                      }}
                    />
                  </label>
                  <button
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Choose File
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <PDFEditor file={pdfFile} onClose={() => setPdfFile(null)} />
        )}
      </main>
    </div>
  );
}

export default App;
