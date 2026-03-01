#!/bin/bash
# US Stock Daily Analyzer - Oracle Cloud Cron Runner
# 미국 장 마감 후 실행 (EST 16:00 = KST 06:00)
# crontab: 0 6 * * 2-6 /home/ubuntu/stock-daily-analyzer/run_us.sh >> /home/ubuntu/stock-daily-analyzer/cron_us.log 2>&1

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

echo "$(date): Starting US stock daily analyzer..."
python3 analyzer_us.py
EXIT_CODE=$?

echo "$(date): Finished with exit code $EXIT_CODE"
deactivate
exit $EXIT_CODE
