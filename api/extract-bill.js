// Vercel Serverless Function: /api/extract-bill
// Hybrid Thai Receipt Extraction: Groq Vision / Gemini Vision / Groq Llama 3.3 Text Parser

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

function cleanJsonString(str) {
  if (!str) return '{}';
  let clean = String(str).trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/```$/, '').trim();
  }
  const match = clean.match(/\{[\s\S]*\}/);
  return match ? match[0] : clean;
}

function normalizeParsedReceipt(parsedData) {
  if (!parsedData || typeof parsedData !== 'object') return;
  if (parsedData.total_amount) parsedData.total_amount = Number(parsedData.total_amount) || 0;
  if (parsedData.discount) parsedData.discount = Number(parsedData.discount) || 0;
  if (Array.isArray(parsedData.items)) {
    parsedData.items = parsedData.items.map((it) => ({
      ...it,
      item_code: String(it.item_code || ''),
      description: String(it.description || ''),
      unit: String(it.unit || 'ชิ้น'),
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      total_price: Number(it.total_price) || 0,
    }));
  } else {
    parsedData.items = [];
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // Diagnostic GET endpoint to inspect environment and available models
  if (req.method === 'GET') {
    let groqModels = [];
    if (apiKey) {
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (resp.ok) {
          const d = await resp.json();
          groqModels = (d.data || []).map((m) => m.id);
        }
      } catch (e) {
        groqModels = [`Error fetching: ${e.message}`];
      }
    }
    return res.status(200).json({
      status: 'ok',
      groq_configured: Boolean(apiKey),
      gemini_configured: Boolean(geminiKey),
      available_groq_models: groqModels,
      supported_modes: ['image_vision', 'ocr_text_structuring'],
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Safely parse request body regardless of whether Vercel passed object, string, or Buffer
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      if (body.startsWith('data:image') || body.startsWith('/9j/')) {
        body = { image: body };
      } else {
        body = { ocr_text: body };
      }
    }
  } else if (Buffer.isBuffer(body)) {
    const str = body.toString('utf-8');
    try {
      body = JSON.parse(str);
    } catch (e) {
      if (str.startsWith('data:image') || str.startsWith('/9j/')) {
        body = { image: str };
      } else {
        body = { ocr_text: str };
      }
    }
  }
  body = body || {};

  const ocrText = String(body.ocr_text || body.text || '').trim();
  let base64Image = body.image || body.image_base64 || body.file || '';
  if (typeof body === 'string' && (body.startsWith('data:image') || body.startsWith('/9j/'))) {
    base64Image = body;
  }

  // If neither OCR text nor image was provided
  if (!ocrText && !base64Image) {
    return res.status(400).json({
      error: 'ไม่พบข้อมูลรูปภาพ (image) หรือข้อความ (ocr_text) สำหรับประมวลผล',
    });
  }

  try {
    // =========================================================================
    // MODE 1: OCR Text Structuring via Groq Llama 3.3 / Gemini Text Model
    // Used when client extracted raw text via browser Tesseract
    // =========================================================================
    if (ocrText) {
      console.log('[Extract-Bill] Processing via OCR text structuring...');
      const textPrompt = `You are a Thai receipt extraction expert.
Analyze this Thai receipt text and output JSON matching this exact structure:
{
  "vendor_name": "ชื่อร้านค้าหรือบริษัทผู้ออกใบเสร็จ",
  "invoice_number": "เลขที่ใบเสร็จหรือใบกำกับภาษี (ไม่ใช่ Tax ID)",
  "invoice_date": "วันที่ในใบเสร็จ (แปลงเป็นรูปแบบไทย เช่น 04/06/2569 หรือ วัน/เดือน/ปี)",
  "discount": 0.0,
  "total_amount": 0.0,
  "items": [
    {
      "item_code": "รหัสสินค้าหรือบาร์โค้ดถ้ามี",
      "description": "ชื่อรายการสินค้าหรือพัสดุ",
      "quantity": 1,
      "unit": "หน่วยนับ (เช่น ชิ้น, กล่อง, แพ็ค, ม้วน, แท่ง, เมตร)",
      "unit_price": 0.0,
      "total_price": 0.0
    }
  ]
}
Instructions:
1. Fix any OCR spelling errors in Thai item names.
2. Include all purchased items with quantities and prices.
3. Respond ONLY with valid JSON. Do not include explanatory text.

Receipt Text:
${ocrText}`;

      let parsedData = null;
      let usedEngine = 'local-text';

      if (apiKey) {
        const textModelsToTry = [
          'llama-3.3-70b-versatile',
          'llama-3.1-8b-instant',
          'qwen-2.5-32b',
          'mixtral-8x7b-32768',
        ];
        for (const tModel of textModelsToTry) {
          try {
            const tResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              },
              body: JSON.stringify({
                model: tModel,
                messages: [
                  {
                    role: 'system',
                    content: 'You output only valid JSON object matching the requested schema.',
                  },
                  { role: 'user', content: textPrompt },
                ],
                temperature: 0.1,
                max_tokens: 2048,
                response_format: { type: 'json_object' },
              }),
            });
            if (tResp.ok) {
              const tData = await tResp.json();
              const content = tData.choices?.[0]?.message?.content;
              if (content) {
                parsedData = JSON.parse(cleanJsonString(content));
                usedEngine = `groq-text (${tModel})`;
                break;
              }
            } else {
              const errTxt = await tResp.text();
              console.warn(`Groq text model ${tModel} status ${tResp.status}:`, errTxt);
            }
          } catch (tErr) {
            console.warn(`Groq text model ${tModel} failed:`, tErr.message);
          }
        }
      }

      if (!parsedData && geminiKey) {
        // Fallback to Gemini text
        try {
          const gResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: textPrompt }] }],
                generationConfig: { temperature: 0.1, response_mime_type: 'application/json' },
              }),
            }
          );
          if (gResp.ok) {
            const gData = await gResp.json();
            const gText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (gText) {
              parsedData = JSON.parse(cleanJsonString(gText));
              usedEngine = 'gemini-text';
            }
          }
        } catch (gErr) {
          console.warn('Gemini text fallback error:', gErr.message);
        }
      }

      if (parsedData) {
        normalizeParsedReceipt(parsedData);
        return res.status(200).json({
          words: [],
          rawText: ocrText,
          parsed: parsedData,
          engine: usedEngine,
          success: true,
        });
      }

      // If text AI could not format it, return rawText with success: false so client uses local rule parser
      return res.status(200).json({
        words: [],
        rawText: ocrText,
        parsed: null,
        engine: 'fallback-local',
        success: false,
        message: 'AI text formatting unavailable, using local client parser',
      });
    }

    // =========================================================================
    // MODE 2: Vision AI Extraction via Image
    // =========================================================================
    let cleanBase64 = base64Image;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    const visionPrompt = `กรุณาอ่านข้อมูลจากรูปใบเสร็จนี้อย่างละเอียด และสรุปเป็น JSON ตามโครงสร้างนี้เท่านั้น:
{
  "vendor_name": "ชื่อร้านค้าหรือบริษัทผู้ออกใบเสร็จ",
  "invoice_number": "เลขที่ใบเสร็จหรือใบกำกับภาษี",
  "invoice_date": "วันที่ในใบเสร็จ (เช่น 04/06/2569 หรือ วัน/เดือน/ปี)",
  "discount": 0.0,
  "total_amount": 0.0,
  "items": [
    {
      "item_code": "รหัสสินค้าหรือบาร์โค้ดถ้ามี",
      "description": "ชื่อรายการสินค้าหรือพัสดุ",
      "quantity": 1,
      "unit": "หน่วยนับ (เช่น ชิ้น, กล่อง, แพ็ค, ม้วน, แท่ง, เมตร)",
      "unit_price": 0.0,
      "total_price": 0.0
    }
  ]
}
ตอบเฉพาะ JSON เท่านั้น ไม่ต้องมีคำอธิบายอื่น`;

    let rawContent = null;
    let usedEngine = 'groq-vision';

    // 1. Check Gemini Vision First if configured (Google AI Studio)
    if (geminiKey) {
      console.log('[Extract-Bill] Attempting Google Gemini Vision...');
      const geminiModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      for (const gModel of geminiModels) {
        try {
          const gResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: visionPrompt },
                      { inline_data: { mime_type: 'image/jpeg', data: cleanBase64 } },
                    ],
                  },
                ],
                generationConfig: { temperature: 0.1, response_mime_type: 'application/json' },
              }),
            }
          );
          if (gResp.ok) {
            const gData = await gResp.json();
            rawContent = gData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawContent) {
              usedEngine = `gemini-vision (${gModel})`;
              break;
            }
          }
        } catch (gErr) {
          console.warn(`Gemini vision model ${gModel} failed:`, gErr.message);
        }
      }
    }

    // 2. Try Groq Vision ONLY if a vision model is confirmed to exist for this API key
    if (!rawContent && apiKey) {
      let availableModelIds = [];
      try {
        const modelsResp = await fetch('https://api.groq.com/openai/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          },
        });
        if (modelsResp.ok) {
          const mData = await modelsResp.json();
          availableModelIds = (mData.data || []).map((m) => m.id);
        }
      } catch (fErr) {
        console.warn('Could not fetch models list:', fErr.message);
      }

      const confirmedVisionModels = availableModelIds.filter((id) => {
        const l = id.toLowerCase();
        return l.includes('vision') || l.includes('scout') || l.includes('vl');
      });

      if (process.env.GROQ_VISION_MODEL) {
        confirmedVisionModels.unshift(process.env.GROQ_VISION_MODEL);
      }

      for (const vModel of confirmedVisionModels) {
        try {
          const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
            body: JSON.stringify({
              model: vModel,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: visionPrompt },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${cleanBase64}` } },
                  ],
                },
              ],
              temperature: 0.1,
              max_tokens: 2048,
            }),
          });
          if (groqResp.ok) {
            const data = await groqResp.json();
            rawContent = data.choices?.[0]?.message?.content;
            if (rawContent) {
              usedEngine = `groq-vision (${vModel})`;
              break;
            }
          }
        } catch (vErr) {
          console.warn(`Groq vision model ${vModel} error:`, vErr.message);
        }
      }

      // If no vision models exist or none succeeded on Groq:
      if (!rawContent) {
        console.log('[Extract-Bill] No active vision models on Groq account. Returning vision_unavailable.');
        return res.status(200).json({
          vision_unavailable: true,
          error: 'Groq API Key ในบัญชีนี้ไม่มีโมเดล Vision ที่เปิดใช้งาน',
          available_models: availableModelIds.slice(0, 8),
          tip: 'สลับไปอ่านตัวอักษรในเบราว์เซอร์อัตโนมัติ',
        });
      }
    }

    if (!rawContent) {
      return res.status(200).json({
        vision_unavailable: true,
        error: 'โมเดล Vision บนคลาวด์ไม่พร้อมใช้งานชั่วคราว',
        tip: 'สลับไปอ่านตัวอักษรในเบราว์เซอร์อัตโนมัติ',
      });
    }

    // Parse and normalize JSON
    const parsedData = JSON.parse(cleanJsonString(rawContent));
    normalizeParsedReceipt(parsedData);

    const rawTextLines = [
      parsedData.vendor_name || '',
      parsedData.invoice_number ? `เลขที่: ${parsedData.invoice_number}` : '',
      parsedData.invoice_date ? `วันที่: ${parsedData.invoice_date}` : '',
      ...(parsedData.items || []).map(
        (it) => `${it.description} ${it.quantity} ${it.unit || 'ชิ้น'} ${it.total_price}`
      ),
      `รวมเงินทั้งสิ้น: ${parsedData.total_amount || 0}`,
    ].filter(Boolean);

    return res.status(200).json({
      words: [],
      rawText: rawTextLines.join('\n'),
      parsed: parsedData,
      engine: usedEngine,
      success: true,
    });
  } catch (error) {
    console.error('OCR Extraction error:', error);
    // Return vision_unavailable status 200 instead of 500 to allow client fallback without throwing
    return res.status(200).json({
      vision_unavailable: true,
      error: error.message || 'เกิดข้อผิดพลาดในการประมวลผลด้วย Vision AI',
      tip: 'สลับไปอ่านตัวอักษรในเบราว์เซอร์อัตโนมัติ',
    });
  }
}
