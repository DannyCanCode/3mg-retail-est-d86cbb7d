import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getGenerativeModel } from 'firebase-admin/ai';

// Ensure admin SDK is initialised exactly once
initializeApp();

export const extractEstimateData = onDocumentWritten('uploads/{uid}/{fileId}', async (event) => {
  try {
    const { uid, fileId } = event.params;
    const bucket = getStorage().bucket();
    const filePath = `uploads/${uid}/${fileId}.pdf`;
    const [bytes] = await bucket.file(filePath).download();

    const gemini = getGenerativeModel({ model: 'gemini-2.0-flash-001' });

    const response = await gemini.generateContent({
      contents: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: bytes.toString('base64'),
          },
        },
        {
          role: 'user',
          parts: [
            {
              text: 'Return JSON {totalArea, areasByPitch:[{pitch,area}]}'
            }
          ],
        },
      ],
    });

    const textPart = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(textPart);
    } catch (err) {
      console.error('[extractEstimateData] JSON parse error', err, textPart);
    }

    await event.data?.ref.parent.parent?.collection('parsed').doc(fileId).set({
      ...parsed,
      model: 'gemini-2.0-flash-001',
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('[extractEstimateData] function error', err);
  }
}); 