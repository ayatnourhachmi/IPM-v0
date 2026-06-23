"""SMTP email helper for sending exported PoC dossiers."""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core.config import settings


def smtp_configured() -> bool:
    return bool(
        settings.smtp_host.strip()
        and settings.smtp_from_email.strip()
    )


def send_email_with_attachment(
    *,
    to_email: str,
    subject: str,
    body: str,
    attachment_filename: str,
    attachment_content: bytes,
    attachment_content_type: str,
) -> None:
    """Send one email with one binary attachment through configured SMTP."""
    if not smtp_configured():
        raise RuntimeError("SMTP is not configured.")

    maintype, _, subtype = attachment_content_type.partition("/")
    if not maintype or not subtype:
        maintype, subtype = "application", "octet-stream"

    from_header = settings.smtp_from_email.strip()
    if settings.smtp_from_name.strip():
        from_header = f"{settings.smtp_from_name.strip()} <{from_header}>"

    message = EmailMessage()
    message["From"] = from_header
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)
    message.add_attachment(
        attachment_content,
        maintype=maintype,
        subtype=subtype,
        filename=attachment_filename,
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username.strip():
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)
