# Level 2 ML Pipeline - Docker Image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Copy .env (should be mounted or provided)
COPY .env .env 2>/dev/null || true

# Set Python path
ENV PYTHONPATH=/app:$PYTHONPATH

# Run pipeline
CMD ["python", "-m", "src.main"]
