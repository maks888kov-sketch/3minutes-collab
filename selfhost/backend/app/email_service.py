import email.utils
from email.message import EmailMessage

import aiosmtplib

from app.config import settings


async def send_email(to: str, subject: str, body: str, from_name: str = "3Minutes") -> None:
    message = EmailMessage()
    message["From"] = email.utils.formataddr((from_name, settings.mail_from))
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    # Mailpit accepts plain SMTP without TLS.
    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        start_tls=False,
        timeout=10,
    )
