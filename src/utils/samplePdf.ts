import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Creates a beautiful sample bilingual document in PDF format to test editing right away.
 */
export async function createSampleBilingualPdf(): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Official bilingual certificate / form template
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page1.getSize();

  // Draw header decorative border
  page1.drawRectangle({
    x: 36,
    y: 36,
    width: width - 72,
    height: height - 72,
    borderColor: rgb(0.15, 0.23, 0.36),
    borderWidth: 2,
    color: rgb(0.99, 0.99, 1.0),
  });

  // Top banner
  page1.drawRectangle({
    x: 40,
    y: height - 120,
    width: width - 80,
    height: 76,
    color: rgb(0.08, 0.25, 0.45),
  });

  page1.drawText('GOVERNMENT & OFFICIAL DOCUMENT TEMPLATE', {
    x: 70,
    y: height - 75,
    size: 16,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Online PDF Editor - Bangla & English Font Demonstration', {
    x: 70,
    y: height - 100,
    size: 11,
    font: helveticaFont,
    color: rgb(0.85, 0.92, 1.0),
  });

  // Section 1: English section
  page1.drawText('SECTION 1: DOCUMENT INFORMATION (ENGLISH)', {
    x: 60,
    y: height - 160,
    size: 12,
    font: helveticaBold,
    color: rgb(0.08, 0.25, 0.45),
  });

  const sampleEnglishLines = [
    'Document Reference: BGD-OFFICIAL-2026-X99',
    'Issue Date: 22 September 2026',
    'Department: Public Administration & Records',
    'Status: Verified & Awaiting Translation / Amendment',
  ];

  let curY = height - 190;
  for (const line of sampleEnglishLines) {
    page1.drawText(line, {
      x: 70,
      y: curY,
      size: 11,
      font: helveticaFont,
      color: rgb(0.2, 0.25, 0.3),
    });
    curY -= 22;
  }

  // Section 2: Instructions for editing Bangla & English
  curY -= 15;
  page1.drawRectangle({
    x: 60,
    y: curY - 90,
    width: width - 120,
    height: 95,
    color: rgb(0.95, 0.97, 1.0),
    borderColor: rgb(0.7, 0.8, 0.95),
    borderWidth: 1,
  });

  page1.drawText('HOW TO EDIT THIS DOCUMENT:', {
    x: 75,
    y: curY - 20,
    size: 11,
    font: helveticaBold,
    color: rgb(0.1, 0.3, 0.6),
  });

  const instructions = [
    '1. Use "Whiteout" tool to conceal any existing text you wish to replace.',
    '2. Click "Text" tool and choose Nikosh or Kalpurush font for Bangla.',
    '3. Choose Roboto or Arial font for English text.',
    '4. Add shapes, highlights, or draw your signature at the bottom.',
    '5. Click "Download PDF" to export a high-resolution edited document.',
  ];

  let instY = curY - 40;
  for (const inst of instructions) {
    page1.drawText(inst, {
      x: 80,
      y: instY,
      size: 9.5,
      font: helveticaFont,
      color: rgb(0.2, 0.25, 0.35),
    });
    instY -= 14;
  }

  // Section 3: Form Fields to fill
  curY -= 130;
  page1.drawText('OFFICIAL RECORD FORM / ফরম এন্ট্রি:', {
    x: 60,
    y: curY,
    size: 12,
    font: helveticaBold,
    color: rgb(0.08, 0.25, 0.45),
  });

  const fields = [
    { label: 'Applicant Full Name / প্রার্থীর নাম:', val: '[ Use Text Tool with Nikosh/Kalpurush ]' },
    { label: 'Designation / পদবী:', val: '[ Add designation here ]' },
    { label: 'Office / কার্যালয়:', val: '[ ঢাকা, বাংলাদেশ ]' },
    { label: 'Remarks / মন্তব্য:', val: '[ অনুমোদিত / Approved ]' },
  ];

  curY -= 30;
  for (const field of fields) {
    page1.drawText(field.label, {
      x: 70,
      y: curY,
      size: 10,
      font: helveticaBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    page1.drawRectangle({
      x: 270,
      y: curY - 6,
      width: 250,
      height: 22,
      borderColor: rgb(0.75, 0.8, 0.85),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    page1.drawText(field.val, {
      x: 278,
      y: curY,
      size: 9,
      font: timesRomanFont,
      color: rgb(0.6, 0.65, 0.7),
    });
    curY -= 34;
  }

  // Footer Signature Block
  curY -= 40;
  page1.drawLine({
    start: { x: 70, y: curY },
    end: { x: 230, y: curY },
    thickness: 1,
    color: rgb(0.4, 0.4, 0.4),
  });
  page1.drawText('Signature of Verifier (স্বাক্ষর)', {
    x: 75,
    y: curY - 15,
    size: 9,
    font: helveticaFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  page1.drawLine({
    start: { x: 360, y: curY },
    end: { x: 520, y: curY },
    thickness: 1,
    color: rgb(0.4, 0.4, 0.4),
  });
  page1.drawText('Official Seal / Stamp (সিলমোহর)', {
    x: 370,
    y: curY - 15,
    size: 9,
    font: helveticaFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Page 2: Blank continuation sheet with header
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  page2.drawRectangle({
    x: 36,
    y: 36,
    width: width - 72,
    height: height - 72,
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });
  page2.drawText('PAGE 2 - SUPPLEMENTARY SHEET (সংযোজনী পৃষ্ঠা)', {
    x: 60,
    y: height - 70,
    size: 11,
    font: helveticaBold,
    color: rgb(0.2, 0.3, 0.45),
  });
  page2.drawLine({
    start: { x: 60, y: height - 78 },
    end: { x: width - 60, y: height - 78 },
    thickness: 1,
    color: rgb(0.8, 0.85, 0.9),
  });

  const sampleBytes = await pdfDoc.save();
  return sampleBytes.buffer as ArrayBuffer;
}
