#!/bin/bash
# Stock Daily Analyzer - Oracle Cloud Cron Runner
# crontab: 30 16 * * 1-5 /home/ubuntu/stock-daily-analyzer/run.sh >> /home/ubuntu/stock-daily-analyzer/cron.log 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "$(date): venv not found, creating..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo "$(date): Starting stock daily analyzer..."
python3 analyzer.py
EXIT_CODE=$?

echo "$(date): Finished with exit code $EXIT_CODE"
deactivate
exit $EXIT_CODE
