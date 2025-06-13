import * as functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getGenerativeModel } from 'firebase-admin/ai';
import { PDFDocument } from 'pdf-lib';

initializeApp();

export const buildProposal = functions.region('us-central1').https.onCall(async (data, context) => {
  const { estimateId } = data as { estimateId?: string };
  if (!estimateId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing estimateId');
  }

  const db = getFirestore();
  const snap = await db.doc(`estimates/${estimateId}`).get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Estimate not found');
  }

  const estimateData = snap.data() ?? {};

  const gemini = getGenerativeModel({ model: 'gemini-2.0-flash-001' });
  const response = await gemini.generateContent({
    contents: [
      { text: `Write a friendly roofing proposal for the following estimate JSON and keep it concise:\n${JSON.stringify(estimateData)}` },
    ],
  });
  const narrative = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Create basic PDF
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  page.drawText(narrative, { x: 40, y: 740, size: 12 });
  const pdfBytes = await pdf.save();

  // Upload to Storage
  const file = getStorage().bucket().file(`proposals/${estimateId}.pdf`);
  await file.save(Buffer.from(pdfBytes), { contentType: 'application/pdf' });
  const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });

  await snap.ref.update({ proposalUrl: url, proposalGeneratedAt: new Date() });

  return { url };
}); 