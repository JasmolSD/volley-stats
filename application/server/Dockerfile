# Stage 1: Build dependencies
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements
COPY requirements.txt .
# Install with verbose output to see what fails
RUN pip install --user --no-cache-dir -r requirements.txt || \
    (echo "Failed to install requirements. Trying one by one..." && \
    cat requirements.txt | while read req; do \
    echo "Installing: $req" && \
    pip install --user --no-cache-dir "$req" || echo "FAILED: $req"; \
    done && exit 1)

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local

# Explicitly copy app.py first
COPY app.py ./

# Copy application code
COPY . .

# Debug: List files
RUN ls -la && python -c "import os; print('Files:', os.listdir('.'))"

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT:-5001} --workers 2 --timeout 120"]