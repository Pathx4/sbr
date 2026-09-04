// Vercel Serverless Function: /api/extract-bill
// High-Speed Thai Receipt Extraction via Groq Vision LPU (Qwen 3.8 / 3.6 Vision)

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ยังไม่ได้ตั้งค่า GROQ_API_KEY ใน Environment Variables ของ Vercel (กรุณาไปที่ Project Settings > Environment Variables เพื่อเพิ่ม GROQ_API_KEY)',
    });
  }

  try {
    let base64Image = '';
    const body = req.body || {};

    if (body.image) {
      base64Image = body.image;
    } else if (body.image_base64) {
      base64Image = body.image_base64;
    } else if (typeof body === 'string' && body.startsWith('data:image')) {
      base64Image = body;
    }

    if (!base64Image) {
      return res.status(400).json({ error: 'ไม่พบข้อมูลรูปภาพ (กรุณาส่งฟิลด์ image เป็น Base64)' });
    }

    // Clean data URL prefix if needed
    let cleanBase64 = base64Image;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    const prompt = `กรุณาอ่านข้อมูลจากรูปใบเสร็จนี้อย่างละเอียด และสรุปเป็น JSON ตามโครงสร้างนี้เท่านั้น:
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

    // Try primary model, fallback to secondary model if rate-limited
    const modelsToTry = ['qwen/qwen3.8-27b', 'qwen/qwen3.6-27b'];
    let lastError = null;
    let rawContent = null;

    for (const model of modelsToTry) {
      try {
        const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${cleanBase64}`,
                    },
                  },
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
          if (rawContent) break;
        } else {
          const errText = await groqResp.text();
          console.warn(`Groq model ${model} failed (${groqResp.status}):`, errText);
          lastError = new Error(`Groq API Error (${groqResp.status}): ${errText}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!rawContent) {
      throw lastError || new Error('ไม่สามารถเชื่อมต่อระบบ Groq Vision AI ได้');
    }

    // Clean JSON markdown block
    let cleanJson = rawContent.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```$/, '').trim();
    }

    let parsedData = {};
    try {
      parsedData = JSON.parse(cleanJson);
    } catch {
      // Fallback regex extraction if model included any conversational text
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        throw new Error('ไม่สามารถถอดรหัส JSON จากการอ่านใบเสร็จได้');
      }
    }

    // Ensure numeric types
    if (parsedData.total_amount) parsedData.total_amount = Number(parsedData.total_amount) || 0;
    if (parsedData.discount) parsedData.discount = Number(parsedData.discount) || 0;
    if (Array.isArray(parsedData.items)) {
      parsedData.items = parsedData.items.map((it) => ({
        ...it,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        total_price: Number(it.total_price) || 0,
      }));
    }

    // Build rawText for display
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
      engine: 'groq-qwen-vision',
      success: true,
    });
  } catch (error) {
    console.error('OCR Extraction error:', error);
    return res.status(500).json({
      error: error.message || 'เกิดข้อผิดพลาดในการประมวลผลใบเสร็จด้วย AI',
    });
  }
}
