#!/bin/sh
set -e
ROLE="${ROLE:-api}"

echo "Waiting for database..."
until python -c "
import sqlalchemy as sa
from app.config import settings
sa.create_engine(settings.database_url).connect().close()
" 2>/dev/null; do
    sleep 2
done

case "$ROLE" in
  worker)
    exec celery -A app.worker worker --loglevel=info --concurrency="${WORKER_CONCURRENCY:-2}"
    ;;
  beat)
    exec celery -A app.worker beat --loglevel=info --schedule=/tmp/celerybeat-schedule
    ;;
  api|all)
    alembic upgrade head
    if [ "$ROLE" = "all" ]; then
        # worker with an embedded scheduler, next to the API
        celery -A app.worker worker -B --loglevel=info --concurrency=1 --schedule=/tmp/celerybeat-schedule &
    fi
    if [ "${DEV:-0}" = "1" ]; then
        exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --reload
    fi
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips="*"
    ;;
esac
