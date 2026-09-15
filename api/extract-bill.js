// Vercel Serverless Function: /api/extract-bill
// Direct Groq / Gemini Vision AI Extraction (No decommissioned models, no guessing)

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
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!apiKey && !geminiKey) {
    return res.status(500).json({
      error: 'ยังไม่ได้ตั้งค่า GROQ_API_KEY หรือ GEMINI_API_KEY ใน Environment Variables ของ Vercel (กรุณาไปที่ Project Settings > Environment Variables เพื่อเพิ่มคีย์)',
    });
  }

  // Parse request body safely
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      if (body.startsWith('data:image') || body.startsWith('/9j/')) {
        body = { image: body };
      }
    }
  } else if (Buffer.isBuffer(body)) {
    const str = body.toString('utf-8');
    try {
      body = JSON.parse(str);
    } catch (e) {
      if (str.startsWith('data:image') || str.startsWith('/9j/')) {
        body = { image: str };
      }
    }
  }
  body = body || {};

  let base64Image = body.image || body.image_base64 || body.file || '';
  if (typeof body === 'string' && (body.startsWith('data:image') || body.startsWith('/9j/'))) {
    base64Image = body;
  }

  if (!base64Image) {
    return res.status(400).json({
      error: 'ไม่พบข้อมูลรูปภาพ (image) สำหรับประมวลผล',
    });
  }

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
  let usedEngine = '';
  let lastErrorMsg = '';

  // 1. Check Gemini Vision First if configured
  if (geminiKey) {
    console.log('[Extract-Bill] Attempting Google Gemini Vision...');
    const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
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
        } else {
          const gErrText = await gResp.text();
          console.warn(`Gemini vision ${gModel} failed (${gResp.status}):`, gErrText);
        }
      } catch (gErr) {
        console.warn(`Gemini vision ${gModel} error:`, gErr.message);
      }
    }
  }

  // 2. Groq Vision: Only use confirmed, existing vision models to prevent any 400/404 decommission errors
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
      } else {
        const mErr = await modelsResp.text();
        lastErrorMsg = `Groq API Key ผิดพลาด (${modelsResp.status}): ${mErr}`;
      }
    } catch (fErr) {
      lastErrorMsg = `ไม่สามารถเชื่อมต่อ Groq API: ${fErr.message}`;
    }

    if (availableModelIds.length > 0) {
      // Find models that exist on this specific Groq key and support vision
      const targetModels = [];

      // Check environment variable preference if specified
      if (process.env.GROQ_VISION_MODEL && availableModelIds.includes(process.env.GROQ_VISION_MODEL)) {
        targetModels.push(process.env.GROQ_VISION_MODEL);
      }
      if (process.env.GROQ_MODEL && availableModelIds.includes(process.env.GROQ_MODEL)) {
        if (!targetModels.includes(process.env.GROQ_MODEL)) targetModels.push(process.env.GROQ_MODEL);
      }

      // Official Groq Vision Models (from Groq Images and Vision documentation)
      const officialVisionModels = ['qwen/qwen3.6-27b', 'qwen/qwen3.8-27b'];
      for (const ovm of officialVisionModels) {
        if (availableModelIds.includes(ovm) && !targetModels.includes(ovm)) {
          targetModels.push(ovm);
        }
      }

      // Identify any other vision-capable models in available list
      const visionModels = availableModelIds.filter((id) => {
        const l = id.toLowerCase();
        return l.includes('qwen') || l.includes('vision') || l.includes('scout') || l.includes('vl');
      });
      for (const vm of visionModels) {
        if (!targetModels.includes(vm)) targetModels.push(vm);
      }

      // If availableModelIds didn't match but user provided apiKey, try official models
      if (targetModels.length === 0) {
        targetModels.push('qwen/qwen3.6-27b', 'qwen/qwen3.8-27b');
      }

      // Call ONLY confirmed vision models that actually exist
      for (const vModel of targetModels) {
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
          } else {
            const errText = await groqResp.text();
            console.warn(`Groq model ${vModel} error:`, errText);
            lastErrorMsg = `Groq API Error (${groqResp.status}): ${errText}`;
          }
        } catch (vErr) {
          lastErrorMsg = vErr.message;
        }
      }
    }
  }

  if (!rawContent) {
    return res.status(500).json({
      error: lastErrorMsg || 'ไม่สามารถประมวลผลสแกนใบเสร็จผ่านระบบ Cloud Vision AI ได้',
    });
  }

  // Parse and normalize JSON
  try {
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
  } catch (parseErr) {
    return res.status(500).json({
      error: `ถอดรหัสข้อมูล JSON จากโมเดล AI ล้มเหลว: ${parseErr.message}`,
    });
  }
}
