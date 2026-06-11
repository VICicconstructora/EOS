FROM python:3.12-slim

# Dependencias de sistema que markitdown[all] puede necesitar (PDFs, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY sharepoint_scraper.py .

# El Job ejecuta el scraper una vez y termina; Azure lo dispara por cron.
CMD ["python", "sharepoint_scraper.py"]
