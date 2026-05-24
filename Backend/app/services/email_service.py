import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import httpx


class EmailService:
    @staticmethod
    def _get_config() -> dict:
        return {
            "postal_server_url": os.getenv("POSTAL_SERVER_URL"),
            "postal_api_key": os.getenv("POSTAL_API_KEY"),
            "postal_server_name": os.getenv("POSTAL_SERVER_NAME"),
            "smtp_host": os.getenv("SMTP_HOST"),
            "smtp_port": int(os.getenv("SMTP_PORT", "587")),
            "smtp_user": os.getenv("SMTP_USER"),
            "smtp_password": os.getenv("SMTP_PASSWORD"),
            "from_email": os.getenv("FROM_EMAIL", "noreply@sentinelai.com"),
            "frontend_base_url": os.getenv("FRONTEND_BASE_URL", "http://localhost:3000"),
        }

    @staticmethod
    def send_invite_email(
        to_email: str,
        token: str,
        org_name: str,
        role_name: str,
        expires_in_days: int = 7,
    ) -> bool:
        config = EmailService._get_config()

        invite_link = f"{config['frontend_base_url'].rstrip('/')}/invite/{token}"

        subject = f"You're invited to join {org_name} on SentinelAI"
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f5f7; padding: 20px;">
            <div style="max-width: 580px; margin: auto; background-color: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
              <h2 style="color: #111827;">You're invited to join {org_name}</h2>
              <p style="color: #374151;">A teammate invited you to join {org_name} on SentinelAI as a <strong>{role_name}</strong>.</p>
              <p style="color: #374151;">Click the button below to accept the invite. The link will expire in {expires_in_days} days.</p>
              <p style="text-align: center; margin: 32px 0;">
                <a href="{invite_link}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 8px;">Accept Invite</a>
              </p>
              <p style="color: #6b7280; font-size: 13px;">If the button does not work, copy and paste this URL into your browser:</p>
              <p style="color: #2563eb; word-break: break-all;">{invite_link}</p>
              <p style="color: #9ca3af; font-size: 13px; margin-top: 16px;">If you did not expect this invite, you can safely ignore this email.</p>
            </div>
          </body>
        </html>
        """

        plain_body = (
            f"You're invited to join {org_name} on SentinelAI as a {role_name}. "
            f"Accept the invite by visiting {invite_link}. "
            f"This link expires in {expires_in_days} days."
        )

        if config["postal_server_url"] and config["postal_api_key"] and config["postal_server_name"]:
            return EmailService._send_via_postal(
                to_email=to_email,
                from_email=config["from_email"],
                subject=subject,
                plain_body=plain_body,
                html_body=html_body,
                server_name=config["postal_server_name"],
                postal_server_url=config["postal_server_url"],
                postal_api_key=config["postal_api_key"],
            )

        if config["smtp_host"] and config["smtp_user"] and config["smtp_password"]:
            return EmailService._send_via_smtp(
                to_email=to_email,
                from_email=config["from_email"],
                subject=subject,
                plain_body=plain_body,
                html_body=html_body,
                smtp_host=config["smtp_host"],
                smtp_port=config["smtp_port"],
                smtp_user=config["smtp_user"],
                smtp_password=config["smtp_password"],
            )

        print("⚠️ No email delivery configuration found. Set Postal or SMTP env vars.")
        return False

    @staticmethod
    def send_plain_email(
        to_email: str,
        subject: str,
        plain_body: str,
        html_body: str | None = None,
    ) -> bool:
        """Send a raw email via Postal (preferred) or SMTP as fallback."""
        config = EmailService._get_config()

        html_body = html_body or f"<pre>{plain_body}</pre>"

        if config["postal_server_url"] and config["postal_api_key"] and config["postal_server_name"]:
            return EmailService._send_via_postal(
                to_email=to_email,
                from_email=config["from_email"],
                subject=subject,
                plain_body=plain_body,
                html_body=html_body,
                server_name=config["postal_server_name"],
                postal_server_url=config["postal_server_url"],
                postal_api_key=config["postal_api_key"],
            )

        if config["smtp_host"] and config["smtp_user"] and config["smtp_password"]:
            return EmailService._send_via_smtp(
                to_email=to_email,
                from_email=config["from_email"],
                subject=subject,
                plain_body=plain_body,
                html_body=html_body,
                smtp_host=config["smtp_host"],
                smtp_port=config["smtp_port"],
                smtp_user=config["smtp_user"],
                smtp_password=config["smtp_password"],
            )

        print("⚠️ No email delivery configuration found. Set Postal or SMTP env vars.")
        return False

    @staticmethod
    def _send_via_postal(
        to_email: str,
        from_email: str,
        subject: str,
        plain_body: str,
        html_body: str,
        server_name: str,
        postal_server_url: str,
        postal_api_key: str,
    ) -> bool:
        url = f"{postal_server_url.rstrip('/')}/api/v1/send/message"
        payload = {
            "server": server_name,
            "from": from_email,
            "to": to_email,
            "subject": subject,
            "plain_body": plain_body,
            "html_body": html_body,
        }
        headers = {
            "Content-Type": "application/json",
            "X-Server-API-Key": postal_api_key,
        }

        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=15)
            response.raise_for_status()
            print(f"✅ Invite email sent via Postal to {to_email}")
            return True
        except Exception as exc:
            body = getattr(exc, "response", None)
            detail = body.text if body is not None else str(exc)
            print(f"❌ Postal send failed for {to_email}: {detail}")
            return False

    @staticmethod
    def _send_via_smtp(
        to_email: str,
        from_email: str,
        subject: str,
        plain_body: str,
        html_body: str,
        smtp_host: str,
        smtp_port: int,
        smtp_user: str,
        smtp_password: str,
    ) -> bool:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = from_email
        message["To"] = to_email
        message.attach(MIMEText(plain_body, "plain"))
        message.attach(MIMEText(html_body, "html"))

        try:
            with smtplib.SMTP(smtp_host, smtp_port) as smtp:
                smtp.starttls()
                smtp.login(smtp_user, smtp_password)
                smtp.sendmail(from_email, [to_email], message.as_string())
            print(f"✅ Invite email sent via SMTP to {to_email}")
            return True
        except Exception as exc:
            print(f"❌ Failed to send invite email to {to_email}: {exc}")
            return False
