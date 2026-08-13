export interface GeminiOcrResponse {
  vendor_name?: string;
  invoice_number?: string;
  invoice_date?: string;
  items: {
    item_code: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
  }[];
}

const SYSTEM_PROMPT = `
You are a highly accurate Thai and English OCR extraction system specializing in receipts and tax invoices (ใบกำกับภาษี/ใบเสร็จรับเงิน).
Your task is to extract data from the provided image and output ONLY valid JSON.
DO NOT wrap the JSON in markdown code blocks (\`\`\`json ... \`\`\`). Just output the raw JSON object.

Extract the following fields:
- vendor_name: The name of the store or company issuing the receipt. Exclude words like "สาขา", "TAX INV", "ต้นฉบับ".
- invoice_number: The receipt or tax invoice number (เลขที่ใบเสร็จ / เลขที่ใบกำกับภาษี). Do NOT confuse with the 13-digit Tax ID.
- invoice_date: The date on the receipt (e.g. "4 มิ.ย. 2569", "04/06/2026").
- items: An array of objects for each purchased product.
  - item_code: The SKU, barcode, or product code (if any). If none, leave empty string "".
  - description: The name/details of the product. Do NOT include table headers like "Order No.", "รายละเอียด".
  - quantity: The number of items purchased (number).
  - unit: The unit of measurement (e.g. "ชิ้น", "แท่ง", "เมตร", "อัน"). Guess from Thai context if missing.
  - unit_price: Price per unit (number).
  - total_price: Total price for that item (number).

If the image is blurry, do your absolute best to guess the correct Thai/English spelling based on context (e.g., "ท่อหด", "สายรัด", "ปืนยิงกาว").
Ignore completely all lines that are not products (e.g. "Subtotal", "VAT 7%", "Cash", "Change", Address lines).
Ensure numbers do not contain commas when formatted as JSON numbers.
`;

export async function extractReceiptWithGemini(
  base64Image: string,
  apiKey: string
): Promise<GeminiOcrResponse> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Remove the data URL prefix if present (e.g., "data:image/jpeg;base64,")
  const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
  const mimeType = base64Image.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error?.message || 'Failed to connect to Gemini API');
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textResponse) {
    throw new Error('Gemini API returned empty response');
  }

  try {
    let cleanedJson = textResponse.trim();
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(cleanedJson) as GeminiOcrResponse;
  } catch (err) {
    console.error("Failed to parse Gemini JSON:", textResponse);
    throw new Error('Failed to parse the receipt data from Gemini response');
  }
}
