FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
# ROLE: api | worker | beat | all (all = API + worker + scheduler in one container,
# for hosts whose free plan has a single web service, e.g. Render)
CMD ["sh", "entrypoint.sh"]
