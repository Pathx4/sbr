# ==========================================
# Stage 1: Build the React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy the rest of the frontend source code and build
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Build the Python Backend
# ==========================================
FROM python:3.10-slim-bullseye

# Set working directory
WORKDIR /app

# Install system dependencies required for OpenCV and PaddleOCR
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

ENV LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libgomp.so.1

# Copy backend requirements and install them
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy all backend source code
COPY backend/ ./

# Copy built frontend assets from Stage 1 into the backend's static directory
COPY --from=frontend-builder /app/frontend/dist /app/static

# Expose port (Hugging Face Spaces requires port 7860, or any generic PORT env var)
EXPOSE 7860

# Run with Gunicorn (production WSGI server) on the dynamic port (defaults to 7860)
CMD ["sh", "-c", "gunicorn --workers 1 --threads 4 --timeout 120 -b 0.0.0.0:${PORT:-7860} app:app"]
