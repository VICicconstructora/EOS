import os
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))

# Alert Thresholds (Example)
ALERT_THRESHOLD_SALES = 1000000  # $1M
ALERT_EMAIL_RECEIVER = os.getenv("ALERT_EMAIL_RECEIVER", "your-email@example.com")
SMTP_SERVER = "smtp.office365.com"
SMTP_PORT = 587
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

def send_alert_email(subject, body):
    """Sends an email alert via SMTP."""
    if not SMTP_USER or not SMTP_PASS or not ALERT_EMAIL_RECEIVER:
        print("Alert Error: SMTP or Receiver credentials not set in .env")
        return

    msg = MIMEMultipart()
    msg['From'] = str(SMTP_USER)
    msg['To'] = str(ALERT_EMAIL_RECEIVER)
    msg['Subject'] = str(subject)
    
    msg.attach(MIMEText(str(body), 'plain'))
    
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(str(SMTP_USER), str(SMTP_PASS))
        server.send_message(msg)
        server.quit()
        print(f"Alert sent to {ALERT_EMAIL_RECEIVER}")
    except Exception as e:
        print(f"Failed to send email: {e}")

def check_kpis_and_alert(data_files):
    """Checks data from JSON files and triggers alerts."""
    for file_path in data_files:
        if not os.path.exists(file_path):
            continue
            
        with open(file_path, "r") as f:
            data = json.load(f)
            
        # Example logic: Sum a column named 'Sales'
        total_sales = sum(item.get('Sales', 0) for item in data)
        
        if total_sales < ALERT_THRESHOLD_SALES:
            subject = f"🚨 KPI Alert: Low Sales in {file_path}"
            body = f"Total sales are currently ${total_sales:,}, which is below the threshold of ${ALERT_THRESHOLD_SALES:,}."
            send_alert_email(subject, body)
        else:
            print(f"KPIs healthy for {file_path}")

if __name__ == "__main__":
    print("--- KPI Alert System ---")
    data_files = [
        "frontend/public/data_generalic.json",
        "frontend/public/data_gnd.json"
    ]
    check_kpis_and_alert(data_files)
