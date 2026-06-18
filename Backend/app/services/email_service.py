import logging
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import aiosmtplib

logger = logging.getLogger(__name__)


class EmailService:
    @staticmethod
    def _get_config() -> dict:
        return {
            "smtp_host": os.getenv("SMTP_HOST", "127.0.0.1"),
            "smtp_port": int(os.getenv("SMTP_PORT", "1025")),
            "smtp_user": os.getenv("SMTP_USER"),
            "smtp_password": os.getenv("SMTP_PASSWORD"),
            "from_email": os.getenv("FROM_EMAIL", "noreply@sentinelai.com"),
            "frontend_base_url": os.getenv("FRONTEND_BASE_URL", "http://localhost:3000"),
            "use_tls": os.getenv("SMTP_TLS", "false").lower() == "true",
        }

    @staticmethod
    def _build_message(
        to_email: str,
        from_email: str,
        subject: str,
        plain_body: str,
        html_body: str,
    ) -> MIMEMultipart:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = from_email
        message["To"] = to_email
        message.attach(MIMEText(plain_body, "plain"))
        message.attach(MIMEText(html_body, "html"))
        return message

    @staticmethod
    async def _send_via_smtp(
        to_email: str,
        from_email: str,
        subject: str,
        plain_body: str,
        html_body: str,
        smtp_host: str | None = None,
        smtp_port: int = 1025,
        smtp_user: str | None = None,
        smtp_password: str | None = None,
        use_tls: bool = True,
    ) -> bool:
        if not smtp_host:
            logger.warning("SMTP_HOST not set — email not sent to %s", to_email)
            return False

        message = EmailService._build_message(
            to_email, from_email, subject, plain_body, html_body
        )

        try:
            smtp = aiosmtplib.SMTP(hostname=smtp_host, port=smtp_port, timeout=15)
            await smtp.connect()
            await smtp.ehlo()
            if use_tls:
                await smtp.starttls()
                await smtp.ehlo()
            if smtp_user and smtp_password:
                await smtp.login(smtp_user, smtp_password)
            await smtp.sendmail(from_email, [to_email], message.as_string())
            await smtp.quit()
            logger.info("Email sent via SMTP to %s", to_email)
            return True
        except Exception as exc:
            logger.error("SMTP send failed for %s: %s", to_email, exc)
            return False

    @staticmethod
    def _build_invite_html(
        headline: str,
        body_paragraphs: list[str],
        button_url: str,
        button_text: str = "Accept Invite",
        expires_in_days: int = 7,
    ) -> tuple[str, str]:
        paragraphs_html = "\n".join(
            f'<p style="color: #374151;">{p}</p>' for p in body_paragraphs
        )
        html = f"""\
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f4f5f7; padding: 20px;">
    <div style="max-width: 580px; margin: auto; background-color: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
      <h2 style="color: #111827;">{headline}</h2>
      {paragraphs_html}
      <p style="text-align: center; margin: 32px 0;">
        <a href="{button_url}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 8px;">{button_text}</a>
      </p>
      <p style="color: #6b7280; font-size: 13px;">If the button does not work, copy and paste this URL into your browser:</p>
      <p style="color: #2563eb; word-break: break-all;">{button_url}</p>
      <p style="color: #9ca3af; font-size: 13px; margin-top: 16px;">If you did not expect this invite, you can safely ignore this email.</p>
    </div>
  </body>
</html>"""
        plain = (
            f"{headline}\n\n"
            + "\n".join(body_paragraphs)
            + f"\n\nAccept the invite by visiting: {button_url}"
            + f"\n\nThis link expires in {expires_in_days} days."
        )
        return html, plain

    @staticmethod
    async def send_org_invite_email(
        to_email: str,
        token: str,
        org_name: str,
        role_name: str,
        expires_in_days: int = 7,
    ) -> bool:
        config = EmailService._get_config()
        link = f"{config['frontend_base_url'].rstrip('/')}/invite/{token}"
        subject = f"You're invited to join {org_name} on SentinelAI"
        html, plain = EmailService._build_invite_html(
            headline=f"You're invited to join {org_name}",
            body_paragraphs=[
                f"A teammate invited you to join <strong>{org_name}</strong> on SentinelAI as a <strong>{role_name}</strong>.",
                f"Click the button below to accept the invite. The link will expire in {expires_in_days} days.",
            ],
            button_url=link,
            expires_in_days=expires_in_days,
        )
        return await EmailService._send_via_smtp(
            to_email=to_email,
            from_email=config["from_email"],
            subject=subject,
            plain_body=plain,
            html_body=html,
            smtp_host=config["smtp_host"],
            smtp_port=config["smtp_port"],
            smtp_user=config["smtp_user"],
            smtp_password=config["smtp_password"],
            use_tls=config["use_tls"],
        )

    @staticmethod
    async def send_workspace_invite_email(
        to_email: str,
        token: str,
        org_name: str,
        workspace_name: str,
        role_name: str,
        expires_in_days: int = 7,
    ) -> bool:
        config = EmailService._get_config()
        link = f"{config['frontend_base_url'].rstrip('/')}/invite/workspace/{token}"
        subject = f"You're invited to join {workspace_name} on SentinelAI"
        html, plain = EmailService._build_invite_html(
            headline=f"You're invited to join {workspace_name}",
            body_paragraphs=[
                f"A teammate invited you to join the <strong>{workspace_name}</strong> workspace in <strong>{org_name}</strong> on SentinelAI as a <strong>{role_name}</strong>.",
                f"Click the button below to accept the invite. The link will expire in {expires_in_days} days.",
            ],
            button_url=link,
            expires_in_days=expires_in_days,
        )
        return await EmailService._send_via_smtp(
            to_email=to_email,
            from_email=config["from_email"],
            subject=subject,
            plain_body=plain,
            html_body=html,
            smtp_host=config["smtp_host"],
            smtp_port=config["smtp_port"],
            smtp_user=config["smtp_user"],
            smtp_password=config["smtp_password"],
            use_tls=config["use_tls"],
        )

    @staticmethod
    async def send_plain_email(
        to_email: str,
        subject: str,
        plain_body: str,
        html_body: str | None = None,
    ) -> bool:
        config = EmailService._get_config()
        html_body = html_body or f"<pre>{plain_body}</pre>"
        return await EmailService._send_via_smtp(
            to_email=to_email,
            from_email=config["from_email"],
            subject=subject,
            plain_body=plain_body,
            html_body=html_body,
            smtp_host=config["smtp_host"],
            smtp_port=config["smtp_port"],
            smtp_user=config["smtp_user"],
            smtp_password=config["smtp_password"],
            use_tls=config["use_tls"],
        )
