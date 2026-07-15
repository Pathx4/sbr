FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy project files
COPY . .

# Expose port (Hugging Face Spaces requires port 7860)
EXPOSE 7860

# Run with Gunicorn (production WSGI server) on port 7860
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:7860", "app:app"]
