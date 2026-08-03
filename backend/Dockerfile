FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and PaddleOCR
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy project files
COPY . .

# Expose port (Hugging Face Spaces requires port 7860)
EXPOSE 7860

# Run with Gunicorn (production WSGI server) on the dynamic port (defaults to 7860)
CMD ["sh", "-c", "gunicorn -w 4 -b 0.0.0.0:${PORT:-7860} app:app"]
