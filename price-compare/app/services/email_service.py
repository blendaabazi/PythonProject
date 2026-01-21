import logging
import smtplib
from email.message import EmailMessage
from typing import Optional

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        username: str,
        password: str,
        from_email: str,
        use_tls: bool = True,
        use_ssl: bool = False,
        timeout_sec: int = 10,
    ) -> None:
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.from_email = from_email or username
        self.use_tls = use_tls
        self.use_ssl = use_ssl
        self.timeout_sec = timeout_sec

    def is_configured(self) -> bool:
        return bool(self.host and self.from_email)

    def send(
        self,
        to_email: str,
        subject: str,
        body: str,
        *,
        html_body: Optional[str] = None,
    ) -> bool:
        if not self.is_configured():
            logger.info("Email service not configured; skip send to %s", to_email)
            return False

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = self.from_email
        message["To"] = to_email
        message.set_content(body)
        if html_body:
            message.add_alternative(html_body, subtype="html")

        try:
            if self.use_ssl:
                client = smtplib.SMTP_SSL(self.host, self.port, timeout=self.timeout_sec)
            else:
                client = smtplib.SMTP(self.host, self.port, timeout=self.timeout_sec)
            with client:
                if self.use_tls and not self.use_ssl:
                    client.starttls()
                if self.username and self.password:
                    client.login(self.username, self.password)
                client.send_message(message)
            return True
        except Exception as exc:
            logger.warning("Email send failed to %s: %s", to_email, exc)
            return False

    def send_password_changed(self, to_email: str, name: Optional[str] = None) -> bool:
        display = name or "there"
        subject = "Your password was updated"
        body = (
            f"Hi {display},\n\n"
            "Your password was updated for your account.\n"
            "If this was not you, contact support.\n"
        )
        return self.send(to_email, subject, body)

    def send_password_reset(
        self,
        to_email: str,
        reset_link: str,
        name: Optional[str] = None,
    ) -> bool:
        display = name or "there"
        subject = "Reset your password"
        body = (
            f"Hi {display},\n\n"
            "We received a request to reset your password.\n"
            "Use the link below within 30 minutes:\n"
            f"{reset_link}\n\n"
            "If you did not request this, you can ignore this email.\n"
        )
        return self.send(to_email, subject, body)
