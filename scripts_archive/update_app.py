import sys

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add HARDCODED_API_KEY definition
if 'HARDCODED_API_KEY' not in content:
    content = content.replace("app = Flask(__name__, static_folder='static', static_url_path='')", 
                              "app = Flask(__name__, static_folder='static', static_url_path='')\n\n# API Key Placeholder\nHARDCODED_API_KEY = \"\"")

# In validate_key()
content = content.replace("api_key = data.get('api_key') or request.headers.get('Authorization')\n    if api_key and api_key.startswith('Bearer '):",
                          "api_key = data.get('api_key') or request.headers.get('Authorization')\n    if not api_key:\n        api_key = HARDCODED_API_KEY\n    if api_key and api_key.startswith('Bearer '):")

# In api_extract()
content = content.replace("api_key = request.headers.get('Authorization')\n    if api_key and api_key.startswith('Bearer '):\n        api_key = api_key[len('Bearer '):]\n        \n    if not api_key:\n        api_key = request.form.get('api_key')\n        \n    if not api_key:",
                          "api_key = request.headers.get('Authorization')\n    if api_key and api_key.startswith('Bearer '):\n        api_key = api_key[len('Bearer '):]\n        \n    if not api_key:\n        api_key = request.form.get('api_key')\n    if not api_key:\n        api_key = HARDCODED_API_KEY\n    if not api_key:")

# In api_analyze_memo()
content = content.replace("api_key = data.get('api_key') or request.headers.get('Authorization')\n    if api_key and api_key.startswith('Bearer '):\n        api_key = api_key[len('Bearer '):]\n        \n    if not api_key:",
                          "api_key = data.get('api_key') or request.headers.get('Authorization')\n    if not api_key:\n        api_key = HARDCODED_API_KEY\n    if api_key and api_key.startswith('Bearer '):\n        api_key = api_key[len('Bearer '):]\n        \n    if not api_key:")

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('app.py updated')
