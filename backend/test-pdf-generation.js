const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createTestPDF() {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Add a page
  const page1 = pdfDoc.addPage([600, 800]);

  // Draw some text on the first page
  page1.drawText('Test PDF Document - Page 1', {
    x: 50,
    y: 750,
    size: 24,
    color: rgb(0, 0, 0),
  });

  page1.drawText('This is a test PDF for the PDF Editor application.', {
    x: 50,
    y: 700,
    size: 14,
    color: rgb(0, 0, 0),
  });

  page1.drawText('It contains multiple pages to test navigation.', {
    x: 50,
    y: 680,
    size: 14,
    color: rgb(0, 0, 0),
  });

  // Add a second page
  const page2 = pdfDoc.addPage([600, 800]);
  page2.drawText('Test PDF Document - Page 2', {
    x: 50,
    y: 750,
    size: 24,
    color: rgb(0, 0, 0),
  });

  page2.drawText('This is the second page of the test PDF.', {
    x: 50,
    y: 700,
    size: 14,
    color: rgb(0, 0, 0),
  });

  // Add a third page
  const page3 = pdfDoc.addPage([600, 800]);
  page3.drawText('Test PDF Document - Page 3', {
    x: 50,
    y: 750,
    size: 24,
    color: rgb(0, 0, 0),
  });

  page3.drawText('This is the third and final page.', {
    x: 50,
    y: 700,
    size: 14,
    color: rgb(0, 0, 0),
  });

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(__dirname, 'test-sample.pdf');
  fs.writeFileSync(outputPath, pdfBytes);

  console.log(`✅ Test PDF created at: ${outputPath}`);
  console.log(`   - 3 pages`);
  console.log(`   - File size: ${pdfBytes.length} bytes`);
}

createTestPDF().catch(console.error);
