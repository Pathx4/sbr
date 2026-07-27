def call_groq_with_retries(api_key, img_bytes, prompt, mime_type="image/jpeg"):
    # Base64 encode the image
    base64_image = base64.b64encode(img_bytes).decode('utf-8')
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # We ask for a JSON object matching the BillExtraction structure
    json_prompt = (
        prompt + "\n"
        "Return the output in JSON format matching this schema:\n"
        "{\n"
        "  \"vendor_name\": \"Name of the company/store (Thai/English)\",\n"
        "  \"invoice_number\": \"Invoice/receipt number\",\n"
        "  \"invoice_date\": \"Invoice date in Thai format (e.g. '28 ตุลาคม 2567')\",\n"
        "  \"doc_type\": \"Type of the document (e.g. 'ใบเสร็จรับเงิน', 'ใบกำกับภาษี', 'ใบเสร็จรับเงิน/ใบกำกับภาษี', 'บิลเงินสด', or other types as written on the header of the document. Default to 'ใบเสร็จรับเงิน/ใบกำกับภาษี' if not explicitly stated.)\",\n"
        "  \"items\": [\n"
        "    {\n"
        "      \"item_code\": \"Product code/SKU/barcode if available, else null\",\n"
        "      \"description\": \"Item name/details (keep serial numbers if present)\",\n"
        "      \"quantity\": 1,\n"
        "      \"unit\": \"The unit of measurement in Thai (e.g. 'ชิ้น', 'อัน', 'ลัง', 'เครื่อง', 'ถัง', 'กระป๋อง', 'ตัว') as appeared on the document. Default to 'ชิ้น' if not specified.\",\n"
        "      \"unit_price\": 100.0,\n"
        "      \"total_price\": 100.0\n"
        "    }\n"
        "  ],\n"
        "  \"discount\": 0.0,\n"
        "  \"grand_total\": 100.0\n"
        "}"
    )
    
    payload = {
        "model": "meta-llama/llama-4-scout-17b-16e-instruct",
        "response_format": { "type": "json_object" },
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": json_prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 4096
    }
    
    for attempt in range(3):
        try:
            print(f"Attempting Groq extraction (llama-3.2-11b-vision-preview), attempt {attempt+1}...")
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            if response.status_code == 200:
                result_json = response.json()
                content = result_json["choices"][0]["message"]["content"]
                return content
            else:
                err_text = response.text
                print(f"Groq failed with status {response.status_code}: {err_text}")
                if response.status_code in [429, 500, 503]:
                    if attempt == 2:
                        raise Exception(f"Groq API Error: {err_text}")
                    time.sleep(2 ** attempt)
                else:
                    raise Exception(f"Groq API Error: {err_text}")
        except Exception as e:
            if attempt == 2:
                raise e
            time.sleep(2 ** attempt)
            
    raise Exception("Groq request timed out or failed.")