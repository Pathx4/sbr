import requests

url = "http://localhost:5000/api/extract-bill"
with open("test_img.jpg", "wb") as f:
    f.write(b"dummy image data")

try:
    files = {'file': open('test_img.jpg', 'rb')}
    response = requests.post(url, files=files)
    print(response.status_code)
    print(response.text)
except Exception as e:
    print(f"Failed to connect: {e}")
