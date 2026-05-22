import React, { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  PDFDocument,
  PDFPage,
  rgb,
  degrees,
  StandardFonts,
  PDFFont,
} from "pdf-lib";
import { useEditorStore } from "../store/useEditorStore";
import {
  TextAnnotation,
  DrawingAnnotation,
  ShapeAnnotation,
  HighlightAnnotation,
  ImageAnnotation,
  SearchResult,
  ExtractedTextItem,
  TextEditAnnotation,
} from "../types";
import Toolbar from "./Toolbar";
import PDFCanvas from "./PDFCanvas";
import PageThumbnails from "./PageThumbnails";
import SearchBar from "./SearchBar";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker - use jsdelivr which supports newer versions
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFEditorProps {
  file: File;
}

const PDFEditor: React.FC<PDFEditorProps> = ({ file }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<File>(file);
  const [loadingProgress, setLoadingProgress] = useState<string>("");
  const [textExtractionProgress, setTextExtractionProgress] =
    useState<number>(0);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const {
    currentPage,
    setCurrentPage,
    setTotalPages,
    zoom,
    setZoom,
    annotations,
    undo,
    redo,
    isSearchOpen,
    setIsSearchOpen,
    searchResults,
    currentSearchIndex,
    setSearchResults,
    setExtractedText,
  } = useEditorStore();

  const onDocumentLoadSuccess = async ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setTotalPages(numPages);
    setCurrentPage(1);
    setLoading(false);
    setLoadingProgress("Extracting text from PDF...");

    // Extract text from all pages for edit mode
    try {
      const loadingTask = pdfjs.getDocument(URL.createObjectURL(currentFile));
      const pdf = await loadingTask.promise;
      const allExtractedText: ExtractedTextItem[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        // Update progress
        const progress = Math.round((pageNum / numPages) * 100);
        setTextExtractionProgress(progress);
        setLoadingProgress(
          `Extracting text from page ${pageNum} of ${numPages}...`
        );

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        // PDF.js sets item.fontName to an opaque id ("g_d0_f1"); the real
        // CSS font family used by the text layer lives on textContent.styles.
        const styles = (textContent as any).styles || {};

        // Group text items into lines based on vertical position
        const textItems: any[] = [];
        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim()) {
            const transform = item.transform;
            const styleFamily: string =
              styles[item.fontName]?.fontFamily ||
              item.fontName ||
              "Arial";
            // PDF subset prefixes look like "ABCDEF+Times-Bold" — strip them
            // so the bold/italic regex matches the real family suffix.
            const cleanFamily = styleFamily.replace(/^[A-Z]{6}\+/, "");
            const isBold =
              /bold|black|heavy|semibold|demibold/i.test(cleanFamily);
            const isItalic = /italic|oblique/i.test(cleanFamily);
            textItems.push({
              str: item.str,
              x: transform[4],
              y: viewport.height - transform[5], // Flip Y coordinate
              width: item.width,
              height: item.height,
              fontSize: Math.round(transform[0]),
              fontName: cleanFamily,
              bold: isBold,
              italic: isItalic,
            });
          }
        });

        // Group items into lines (items with similar Y coordinates)
        const lines: any[][] = [];
        const yThreshold = 5; // Pixels tolerance for same line

        textItems.forEach((item) => {
          // Find a line this item belongs to
          let foundLine = false;
          for (const line of lines) {
            if (line.length > 0) {
              const avgY = line.reduce((sum, i) => sum + i.y, 0) / line.length;
              if (Math.abs(item.y - avgY) <= yThreshold) {
                line.push(item);
                foundLine = true;
                break;
              }
            }
          }

          if (!foundLine) {
            lines.push([item]);
          }
        });

        // Sort lines by Y position (top to bottom)
        lines.sort((a, b) => {
          const avgYA = a.reduce((sum, i) => sum + i.y, 0) / a.length;
          const avgYB = b.reduce((sum, i) => sum + i.y, 0) / b.length;
          return avgYA - avgYB;
        });

        // Process each line to get its properties.
        // NOTE: item.y is the baseline in canvas coords. The visible glyph
        // extends ~fontSize above the baseline (ascender) and a small amount
        // below (descender). Use those to build an accurate bounding box —
        // otherwise the white "cover" rectangle on export misses the top of
        // the original text and it bleeds through behind the edited text.
        const processedLines = lines.map((line, lineIndex) => {
          line.sort((a, b) => a.x - b.x);

          const lineText = line.map((item) => item.str).join(" ");
          const minX = Math.min(...line.map((item) => item.x));
          const maxX = Math.max(...line.map((item) => item.x + item.width));
          const avgFontSize = Math.round(
            line.reduce((sum, i) => sum + i.fontSize, 0) / line.length
          );
          const baselineY = Math.max(...line.map((item) => item.y));
          const topY = Math.min(
            ...line.map((item) => item.y - item.fontSize)
          );
          const bottomY = baselineY + avgFontSize * 0.25;

          // Treat the line as bold/italic when the majority of its glyphs are.
          const boldCount = line.filter((i) => i.bold).length;
          const italicCount = line.filter((i) => i.italic).length;

          return {
            text: lineText,
            x: minX,
            maxX: maxX,
            y: topY,
            maxY: bottomY,
            baselineY,
            width: maxX - minX,
            height: bottomY - topY,
            fontSize: avgFontSize,
            fontFamily: line[0].fontName,
            bold: boldCount * 2 >= line.length,
            italic: italicCount * 2 >= line.length,
            lineIndex,
          };
        });

        // Group lines into paragraphs/text blocks based on:
        // 1. Vertical proximity (gap between lines should be less than 1.5x line height)
        // 2. Similar X position (left alignment within tolerance)
        // 3. Similar font properties
        const paragraphs: typeof processedLines[] = [];
        const xTolerance = 20; // Pixels tolerance for considering lines as same block

        processedLines.forEach((line) => {
          // Try to find an existing paragraph this line belongs to
          let foundParagraph = false;

          for (const paragraph of paragraphs) {
            if (paragraph.length > 0) {
              const lastLine = paragraph[paragraph.length - 1];
              
              // Gap between baselines (more stable than gap between bounding boxes,
              // which can slightly overlap due to ascender/descender padding).
              const baselineGap = line.baselineY - lastLine.baselineY;
              const expectedLineHeight =
                Math.max(lastLine.fontSize, line.fontSize) * 1.8;

              // Lines belong to the same paragraph when the next baseline is
              // below the previous one and within ~1.8x line height.
              const isVerticallyClose =
                baselineGap > 0 && baselineGap < expectedLineHeight;
              
              // Check if X positions are similar (same text block)
              const isHorizontallyAligned = Math.abs(line.x - lastLine.x) < xTolerance;
              
              // Check if font properties are similar
              const isSameFont = line.fontFamily === lastLine.fontFamily &&
                                 Math.abs(line.fontSize - lastLine.fontSize) <= 2;

              if (isVerticallyClose && isHorizontallyAligned && isSameFont) {
                paragraph.push(line);
                foundParagraph = true;
                break;
              }
            }
          }

          if (!foundParagraph) {
            paragraphs.push([line]);
          }
        });

        // Create ExtractedTextItem for each paragraph
        paragraphs.forEach((paragraph, paragraphIndex) => {
          // Combine all lines in the paragraph
          const paragraphText = paragraph.map((line) => line.text).join("\n");
          const minX = Math.min(...paragraph.map((line) => line.x));
          const maxX = Math.max(...paragraph.map((line) => line.maxX));
          const minY = Math.min(...paragraph.map((line) => line.y));
          const maxY = Math.max(...paragraph.map((line) => line.maxY));
          const avgFontSize = Math.round(
            paragraph.reduce((sum, line) => sum + line.fontSize, 0) / paragraph.length
          );

          // Measure the source line spacing (baseline-to-baseline) so edited
          // text can be re-flowed with the original line height instead of a
          // generic 1.2x guess.
          let measuredLineHeight = avgFontSize * 1.2;
          if (paragraph.length >= 2) {
            const gaps: number[] = [];
            for (let i = 1; i < paragraph.length; i++) {
              gaps.push(paragraph[i].baselineY - paragraph[i - 1].baselineY);
            }
            const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
            if (avgGap > 0) measuredLineHeight = avgGap;
          }

          // Detect alignment from per-line offsets inside the paragraph,
          // not from the paragraph bbox vs the page. A wide left-aligned
          // body paragraph has near-equal page margins too, which the old
          // bbox heuristic misread as "centered".
          const pageWidth = viewport.width;
          let textAlign: 'left' | 'center' | 'right' = 'left';

          if (paragraph.length >= 2) {
            const blockLeft = minX;
            const blockRight = maxX;
            const blockCenter = (blockLeft + blockRight) / 2;
            const tol = Math.max(4, avgFontSize * 0.5);

            let leftHits = 0;
            let rightHits = 0;
            let centerHits = 0;
            for (const line of paragraph) {
              const lineCenter = (line.x + line.maxX) / 2;
              if (Math.abs(line.x - blockLeft) <= tol) leftHits++;
              if (Math.abs(line.maxX - blockRight) <= tol) rightHits++;
              if (Math.abs(lineCenter - blockCenter) <= tol) centerHits++;
            }
            const n = paragraph.length;
            // Prefer "left" when both left and center match (justified or
            // ragged-right body text); only call it centered when the
            // centers line up but the left edges do NOT.
            if (leftHits >= n * 0.7) {
              textAlign = 'left';
            } else if (centerHits >= n * 0.7 && leftHits < n * 0.5) {
              textAlign = 'center';
            } else if (rightHits >= n * 0.7 && leftHits < n * 0.5) {
              textAlign = 'right';
            }
          }
          // Single-line paragraphs are ambiguous — leave as left.

          // Paragraph inherits formatting from the majority of its lines.
          const boldLines = paragraph.filter((l) => l.bold).length;
          const italicLines = paragraph.filter((l) => l.italic).length;

          allExtractedText.push({
            id: `text-${pageNum}-${paragraphIndex}`,
            text: paragraphText,
            x: minX,
            y: maxY, // canvas Y of the block's visible bottom (incl. descender)
            width: maxX - minX,
            height: maxY - minY,
            fontSize: avgFontSize,
            fontFamily: paragraph[0].fontFamily,
            pageNumber: pageNum,
            textAlign,
            pageWidth,
            lineHeight: measuredLineHeight,
            firstBaselineY: paragraph[0].baselineY,
            bold: boldLines * 2 >= paragraph.length,
            italic: italicLines * 2 >= paragraph.length,
          });
        });
      }

      setExtractedText(allExtractedText);
      setLoadingProgress("");
      setTextExtractionProgress(0);
    } catch (error) {
      console.error("Error extracting text:", error);
      setLoadingProgress("");
      setTextExtractionProgress(0);
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    alert("Failed to load PDF. Please try another file.");
    setLoading(false);
  };

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, setCurrentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, numPages, setCurrentPage]);

  const handleZoomIn = useCallback(() => {
    setZoom(zoom + 0.1);
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(zoom - 0.1);
  }, [zoom, setZoom]);

  // Embed the small set of standard fonts and return a picker that maps a
  // detected fontFamily string to the closest available font + bold variant.
  const loadFonts = async (pdfDoc: PDFDocument) => {
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(
      StandardFonts.HelveticaOblique
    );
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesRomanItalic = await pdfDoc.embedFont(
      StandardFonts.TimesRomanItalic
    );
    const courier = await pdfDoc.embedFont(StandardFonts.Courier);
    const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

    return (
      fontFamily: string | undefined,
      boldOverride?: boolean,
      italicOverride?: boolean
    ): PDFFont => {
      const f = (fontFamily || "").toLowerCase();
      const familyBold = /bold|black|heavy|semibold/.test(f);
      const familyItalic = /italic|oblique/.test(f);
      // Explicit flags (from the annotation) win over family-name guessing.
      const isBold = boldOverride ?? familyBold;
      const isItalic = italicOverride ?? familyItalic;
      const isMono = /mono|courier|consolas|menlo/.test(f);
      const isSerif = /serif|times|roman|georgia|garamond|cambria/.test(f);
      if (isMono) return isBold ? courierBold : courier;
      if (isSerif) {
        if (isBold) return timesRomanBold;
        if (isItalic) return timesRomanItalic;
        return timesRoman;
      }
      if (isBold) return helveticaBold;
      if (isItalic) return helveticaOblique;
      return helvetica;
    };
  };

  // Word-wrap a string to a max width using the embedded font's real glyph
  // metrics. Honours hard \n breaks. If a single word is longer than maxWidth
  // we still emit it on its own line (don't drop content).
  const wrapTextToWidth = (
    text: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number
  ): string[] => {
    const out: string[] = [];
    const paragraphs = text.split("\n");
    for (const paragraph of paragraphs) {
      if (paragraph.length === 0) {
        out.push("");
        continue;
      }
      const words = paragraph.split(/\s+/);
      let current = "";
      for (const word of words) {
        if (!word) continue;
        const candidate = current ? current + " " + word : word;
        if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
          current = candidate;
        } else {
          if (current) out.push(current);
          current = word;
        }
      }
      if (current) out.push(current);
    }
    return out;
  };

  // Paint an edited text block onto the page: cover the original with a white
  // rectangle wide enough to hide the original glyphs (incl. ascenders the
  // bbox underestimates), then re-draw the new text using a font close to the
  // original, with word-wrap inside the block width.
  const drawTextEdit = (
    page: PDFPage,
    pageHeight: number,
    ann: TextEditAnnotation,
    pickFont: (
      fontFamily: string | undefined,
      bold?: boolean,
      italic?: boolean
    ) => PDFFont
  ) => {
    const { fontSize, fontFamily, color, newText } = ann.data;
    const textAlign = ann.data.textAlign || "left";
    const font = pickFont(fontFamily, ann.data.bold, ann.data.italic);
    const colorRgb = hexToRgb(color);

    const blockWidth = ann.width || 100;
    const blockTopCanvas = ann.y - (ann.height || 0);
    const blockBottomCanvas = ann.y;
    const lineHeight = ann.data.lineHeight || fontSize * 1.2;

    // Wrap before sizing the cover rectangle so it grows downward to fit any
    // extra lines (the edited text may be longer than the source).
    const wrapped = wrapTextToWidth(newText, font, fontSize, blockWidth);
    const wrappedHeight = Math.max(
      ann.height || fontSize,
      wrapped.length * lineHeight + fontSize * 0.25
    );

    // Convert to PDF coords (Y from bottom). Padding above covers ascenders
    // the original bbox underestimates.
    const padX = Math.max(4, fontSize * 0.3);
    const padTop = Math.max(6, fontSize * 0.4);
    const padBottom = Math.max(4, fontSize * 0.3);
    const rectX = ann.x - padX;
    const rectBottomPdf = pageHeight - blockBottomCanvas - padBottom -
      Math.max(0, wrappedHeight - (ann.height || 0));
    const rectWidth = blockWidth + padX * 2;
    const rectHeight = wrappedHeight + padTop + padBottom;

    page.drawRectangle({
      x: rectX,
      y: rectBottomPdf,
      width: rectWidth,
      height: rectHeight,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });

    // Place the first new line on the original first-line baseline when we
    // recorded it; otherwise fall back to one fontSize below the block top.
    const firstBaselinePdf =
      ann.data.firstBaselineY != null
        ? pageHeight - ann.data.firstBaselineY
        : pageHeight - blockTopCanvas - fontSize;

    wrapped.forEach((line, index) => {
      if (!line) return;
      const textWidth = font.widthOfTextAtSize(line, fontSize);
      let xPos = ann.x;
      if (textAlign === "center") {
        xPos = ann.x + (blockWidth - textWidth) / 2;
      } else if (textAlign === "right") {
        xPos = ann.x + blockWidth - textWidth;
      }
      page.drawText(line, {
        x: xPos,
        y: firstBaselinePdf - index * lineHeight,
        size: fontSize,
        font,
        color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
      });
    });
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

  const handleDownload = useCallback(async () => {
    if (annotations.length === 0) {
      // If no annotations, just download the current file
      const url = URL.createObjectURL(currentFile);
      const link = document.createElement("a");
      link.href = url;
      link.download = currentFile.name.replace(".pdf", "_edited.pdf");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    try {
      // Load the current PDF
      setDownloadProgress(5);
      const arrayBuffer = await currentFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const pickFont = await loadFonts(pdfDoc);
      setDownloadProgress(10);

      // Render annotations onto each page
      const totalAnnotations = annotations.length;
      for (let i = 0; i < annotations.length; i++) {
        const annotation = annotations[i];
        // Update progress (10% to 80% for annotations)
        const progress = 10 + Math.round((i / totalAnnotations) * 70);
        setDownloadProgress(progress);
        const pageIndex = annotation.pageNumber - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;

        const page = pages[pageIndex];
        const { height: pageHeight } = page.getSize();

        if (annotation.type === "text") {
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
            console.error("Error drawing text annotation:", error);
          }
        } else if (annotation.type === "textEdit") {
          try {
            drawTextEdit(
              page,
              pageHeight,
              annotation as TextEditAnnotation,
              pickFont
            );
          } catch (error) {
            console.error("Error drawing text edit annotation:", error);
          }
        } else if (annotation.type === "shape") {
          const shapeAnn = annotation as ShapeAnnotation;
          const color = hexToRgb(shapeAnn.data.strokeColor);

          if (shapeAnn.data.shapeType === "rectangle") {
            page.drawRectangle({
              x: shapeAnn.x,
              y: pageHeight - shapeAnn.y - (shapeAnn.height || 0),
              width: shapeAnn.width || 0,
              height: shapeAnn.height || 0,
              borderColor: rgb(color.r, color.g, color.b),
              borderWidth: shapeAnn.data.strokeWidth,
            });
          } else if (shapeAnn.data.shapeType === "circle") {
            const centerX = shapeAnn.x + (shapeAnn.width || 0) / 2;
            const centerY =
              pageHeight - shapeAnn.y - (shapeAnn.height || 0) / 2;
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
          } else if (
            shapeAnn.data.shapeType === "line" ||
            shapeAnn.data.shapeType === "arrow"
          ) {
            page.drawLine({
              start: { x: shapeAnn.x, y: pageHeight - shapeAnn.y },
              end: {
                x: shapeAnn.data.endX || shapeAnn.x,
                y: pageHeight - (shapeAnn.data.endY || shapeAnn.y),
              },
              thickness: shapeAnn.data.strokeWidth,
              color: rgb(color.r, color.g, color.b),
            });
            // Note: Arrow heads are not rendered in pdf-lib (limitation)
          }
        } else if (annotation.type === "highlight") {
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
        } else if (annotation.type === "drawing") {
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
        } else if (annotation.type === "image") {
          const imageAnn = annotation as ImageAnnotation;

          try {
            // Fetch the image data from the base64 data URL
            const imageData = imageAnn.data.src;
            let embeddedImage;

            if (imageData.startsWith("data:image/png")) {
              const pngImageBytes = await fetch(imageData).then((res) =>
                res.arrayBuffer()
              );
              embeddedImage = await pdfDoc.embedPng(pngImageBytes);
            } else if (
              imageData.startsWith("data:image/jpeg") ||
              imageData.startsWith("data:image/jpg")
            ) {
              const jpgImageBytes = await fetch(imageData).then((res) =>
                res.arrayBuffer()
              );
              embeddedImage = await pdfDoc.embedJpg(jpgImageBytes);
            } else {
              // Try PNG as default
              const pngImageBytes = await fetch(imageData).then((res) =>
                res.arrayBuffer()
              );
              embeddedImage = await pdfDoc.embedPng(pngImageBytes);
            }

            page.drawImage(embeddedImage, {
              x: imageAnn.x,
              y: pageHeight - imageAnn.y - (imageAnn.height || 0),
              width: imageAnn.width || 100,
              height: imageAnn.height || 100,
            });
          } catch (error) {
            console.error("Error drawing image annotation:", error);
          }
        }
      }

      // Save and download the modified PDF
      setDownloadProgress(80);
      const pdfBytes = await pdfDoc.save();
      setDownloadProgress(90);
      const blob = new Blob([pdfBytes as unknown as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = currentFile.name.replace(".pdf", "_edited.pdf");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadProgress(100);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF with annotations. Please try again.");
      setDownloadProgress(0);
    } finally {
      setDownloading(false);
      setTimeout(() => setDownloadProgress(0), 1000); // Reset after 1 second
    }
  }, [annotations, currentFile]);

  const handlePageDelete = async (pageNumber: number) => {
    if (numPages <= 1) {
      alert("Cannot delete the only page in the document.");
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
      const blob = new Blob([pdfBytes as unknown as BlobPart], {
        type: "application/pdf",
      });
      const newFile = new File([blob], currentFile.name, {
        type: "application/pdf",
      });

      // Update state
      setCurrentFile(newFile);

      // Filter out annotations from the deleted page
      const { annotations: allAnnotations } = useEditorStore.getState();
      const filteredAnnotations = allAnnotations.filter(
        (ann) => ann.pageNumber !== pageNumber
      );

      // Adjust page numbers for annotations after the deleted page
      const adjustedAnnotations = filteredAnnotations.map((ann) => {
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
      console.error("Error deleting page:", error);
      alert("Failed to delete page. Please try again.");
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
      const blob = new Blob([pdfBytes as unknown as BlobPart], {
        type: "application/pdf",
      });
      const newFile = new File([blob], currentFile.name, {
        type: "application/pdf",
      });

      // Update state to force re-render
      setCurrentFile(newFile);

      // Force a re-render by toggling a state variable
      setLoading(false);

      // Small timeout to ensure the Document component re-renders
      setTimeout(() => {
        setNumPages(numPages); // This triggers re-render
      }, 100);
    } catch (error) {
      console.error("Error rotating page:", error);
      alert("Failed to rotate page. Please try again.");
      setLoading(false);
    }
  };

  const handlePrint = useCallback(async () => {
    try {
      // If there are annotations, we need to render them into the PDF first
      if (annotations.length > 0) {
        // Use the same download logic but open in new window for printing
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const pickFont = await loadFonts(pdfDoc);

        // Render annotations onto each page (same as download)
        for (const annotation of annotations) {
          const pageIndex = annotation.pageNumber - 1;
          if (pageIndex < 0 || pageIndex >= pages.length) continue;

          const page = pages[pageIndex];
          const { height: pageHeight } = page.getSize();

          if (annotation.type === "text") {
            const textAnn = annotation as TextAnnotation;
            const colorRgb = hexToRgb(textAnn.data.color);
            page.drawText(textAnn.data.text, {
              x: textAnn.x,
              y: pageHeight - textAnn.y - textAnn.data.fontSize,
              size: textAnn.data.fontSize,
              color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
            });
          } else if (annotation.type === "textEdit") {
            try {
              drawTextEdit(
                page,
                pageHeight,
                annotation as TextEditAnnotation,
                pickFont
              );
            } catch (error) {
              console.error(
                "Error drawing text edit annotation in print:",
                error
              );
            }
          } else if (annotation.type === "drawing") {
            const drawingAnn = annotation as DrawingAnnotation;
            const colorRgb = hexToRgb(drawingAnn.data.color);
            for (const path of drawingAnn.data.paths) {
              for (let i = 0; i < path.length - 1; i++) {
                const point1 = path[i];
                const point2 = path[i + 1];
                page.drawLine({
                  start: { x: point1.x, y: pageHeight - point1.y },
                  end: { x: point2.x, y: pageHeight - point2.y },
                  thickness: drawingAnn.data.width,
                  color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
                });
              }
            }
          } else if (annotation.type === "shape") {
            const shapeAnn = annotation as ShapeAnnotation;
            const colorRgb = hexToRgb(shapeAnn.data.strokeColor);

            if (shapeAnn.data.shapeType === "rectangle") {
              page.drawRectangle({
                x: shapeAnn.x,
                y: pageHeight - shapeAnn.y - (shapeAnn.height || 0),
                width: shapeAnn.width || 0,
                height: shapeAnn.height || 0,
                borderColor: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
                borderWidth: shapeAnn.data.strokeWidth,
              });
            } else if (shapeAnn.data.shapeType === "circle") {
              const centerX = shapeAnn.x + (shapeAnn.width || 0) / 2;
              const centerY =
                pageHeight - shapeAnn.y - (shapeAnn.height || 0) / 2;
              const radiusX = (shapeAnn.width || 0) / 2;
              const radiusY = (shapeAnn.height || 0) / 2;
              page.drawEllipse({
                x: centerX,
                y: centerY,
                xScale: radiusX,
                yScale: radiusY,
                borderColor: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
                borderWidth: shapeAnn.data.strokeWidth,
              });
            } else if (
              shapeAnn.data.shapeType === "line" ||
              shapeAnn.data.shapeType === "arrow"
            ) {
              page.drawLine({
                start: { x: shapeAnn.x, y: pageHeight - shapeAnn.y },
                end: {
                  x: shapeAnn.data.endX || shapeAnn.x,
                  y: pageHeight - (shapeAnn.data.endY || shapeAnn.y),
                },
                thickness: shapeAnn.data.strokeWidth,
                color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
              });
            }
          } else if (annotation.type === "highlight") {
            const highlightAnn = annotation as HighlightAnnotation;
            const colorRgb = hexToRgb(highlightAnn.data.color);
            page.drawRectangle({
              x: highlightAnn.x,
              y: pageHeight - highlightAnn.y - (highlightAnn.height || 0),
              width: highlightAnn.width || 0,
              height: highlightAnn.height || 0,
              color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
              opacity: highlightAnn.data.opacity,
            });
          } else if (annotation.type === "image") {
            const imageAnn = annotation as ImageAnnotation;
            try {
              const imageBytes = await fetch(imageAnn.data.src).then((res) =>
                res.arrayBuffer()
              );
              let embeddedImage;
              if (imageAnn.data.src.startsWith("data:image/png")) {
                embeddedImage = await pdfDoc.embedPng(imageBytes);
              } else {
                embeddedImage = await pdfDoc.embedJpg(imageBytes);
              }
              page.drawImage(embeddedImage, {
                x: imageAnn.x,
                y: pageHeight - imageAnn.y - (imageAnn.height || 100),
                width: imageAnn.width || 100,
                height: imageAnn.height || 100,
              });
            } catch (error) {
              console.error("Error drawing image annotation in print:", error);
            }
          }
        }

        // Save and open for printing
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes as unknown as BlobPart], {
          type: "application/pdf",
        });
        const url = URL.createObjectURL(blob);

        // Open in new window and trigger print
        const printWindow = window.open(url, "_blank");
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } else {
        // No annotations, just print the original PDF
        const url = URL.createObjectURL(currentFile);
        const printWindow = window.open(url, "_blank");
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      }
    } catch (error) {
      console.error("Error printing PDF:", error);
      alert("Failed to print PDF. Please try again.");
    }
  }, [annotations, currentFile]);

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
      const blob = new Blob([pdfBytes as unknown as BlobPart], {
        type: "application/pdf",
      });
      const newFile = new File([blob], currentFile.name, {
        type: "application/pdf",
      });

      // Update state
      setCurrentFile(newFile);

      // Update annotations with new page numbers
      const { annotations: allAnnotations } = useEditorStore.getState();
      const reorderedAnnotations = allAnnotations.map((ann) => {
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
      console.error("Error reordering pages:", error);
      alert("Failed to reorder pages. Please try again.");
      setLoading(false);
    }
  };

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const results: SearchResult[] = [];
        const loadingTask = pdfjs.getDocument(URL.createObjectURL(currentFile));
        const pdf = await loadingTask.promise;

        // Search through all pages
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();

          // Combine all text items into a single string
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");

          // Find all occurrences of the search query (case-insensitive)
          const lowerQuery = query.toLowerCase();
          const lowerText = pageText.toLowerCase();
          let index = 0;
          let position = lowerText.indexOf(lowerQuery, index);

          while (position !== -1) {
            results.push({
              pageNumber: pageNum,
              text: pageText.substring(
                Math.max(0, position - 20),
                Math.min(pageText.length, position + query.length + 20)
              ),
              index: results.length,
            });
            index = position + 1;
            position = lowerText.indexOf(lowerQuery, index);
          }
        }

        setSearchResults(results);
      } catch (error) {
        console.error("Error searching PDF:", error);
        setSearchResults([]);
      }
    },
    [currentFile, numPages, setSearchResults]
  );

  const handleSearchToggle = useCallback(() => {
    setIsSearchOpen(!isSearchOpen);
  }, [isSearchOpen, setIsSearchOpen]);

  // Navigate to search result when currentSearchIndex changes
  useEffect(() => {
    if (searchResults.length > 0 && currentSearchIndex >= 0) {
      const result = searchResults[currentSearchIndex];
      if (result && result.pageNumber !== currentPage) {
        setCurrentPage(result.pageNumber);
      }
    }
  }, [currentSearchIndex, searchResults, currentPage, setCurrentPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if target is an input element to avoid conflicts
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl/Cmd + Y OR Ctrl/Cmd + Shift + Z: Redo
      else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      }

      // Ctrl/Cmd + S: Save
      else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleDownload();
      }

      // Ctrl/Cmd + P: Print
      else if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        handlePrint();
      }

      // Ctrl/Cmd + F: Search
      else if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        handleSearchToggle();
      }

      // Arrow keys: Page navigation
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        handleNextPage();
      }

      // + or =: Zoom in
      else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      }

      // -: Zoom out
      else if (e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    undo,
    redo,
    handlePrevPage,
    handleNextPage,
    handleZoomIn,
    handleZoomOut,
    handleSearchToggle,
    handleDownload,
    handlePrint,
  ]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Toolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onSearchToggle={handleSearchToggle}
        downloading={downloading}
        downloadProgress={downloadProgress}
        zoom={zoom}
        currentPage={currentPage}
        totalPages={numPages}
        onPageChange={setCurrentPage}
      />

      <SearchBar onSearch={handleSearch} />

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

      <div className="flex-1 overflow-auto bg-gray-200 dark:bg-gray-800 p-4 transition-colors">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                Loading PDF...
              </p>
            </div>
          </div>
        )}

        {!loading && loadingProgress && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-700 px-6 py-4 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-600">
            <div className="text-center">
              <div className="text-sm text-gray-700 dark:text-gray-200 mb-2">
                {loadingProgress}
              </div>
              <div className="w-64 bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${textExtractionProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {textExtractionProgress}%
              </div>
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
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          title="Go to previous page (Left arrow key)"
        >
          Previous
        </button>

        <span
          className="text-sm text-gray-700"
          title="Current page number and total pages"
        >
          Page {currentPage} of {numPages}
        </span>

        <button
          onClick={handleNextPage}
          disabled={currentPage >= numPages}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
