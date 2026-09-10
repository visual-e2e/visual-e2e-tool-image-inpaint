FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

ENV INPAINT_HOST=0.0.0.0
ENV INPAINT_PORT=9000
ENV INPAINT_DEVICE=cpu
ENV INPAINT_PRELOAD=1

EXPOSE 9000

CMD ["python", "app.py"]
