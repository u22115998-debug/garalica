import resend
from app.config import get_settings

settings = get_settings()

if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY

SENDER_EMAIL = "noreply@garakrral.com"

def send_verification_email(to_email: str, code: str):
    if not settings.RESEND_API_KEY:
        print(f"RESEND_API_KEY not set. Mock sending code {code} to {to_email}")
        return

    try:
        r = resend.Emails.send({
            "from": f"Bugs Tracker <{SENDER_EMAIL}>",
            "to": to_email,
            "subject": "Verify your email address",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #333;">Verify your email</h2>
                <p>Hello,</p>
                <p>Please use the following 6-digit code to verify your email address:</p>
                <h1 style="background: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px; border-radius: 5px;">{code}</h1>
                <p>This code will expire in 15 minutes.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
            """
        })
        print(f"Sent verification email to {to_email}: {r}")
    except Exception as e:
        print(f"Failed to send verification email to {to_email}: {e}")

def send_comment_notification(to_email: str, issue_key: str, commenter_name: str, comment_body: str):
    if not settings.RESEND_API_KEY:
        print(f"RESEND_API_KEY not set. Mock sending notification to {to_email} about issue {issue_key}")
        return

    try:
        formatted_body = comment_body.replace('\n', '<br>')
        r = resend.Emails.send({
            "from": f"Bugs Tracker <{SENDER_EMAIL}>",
            "to": to_email,
            "subject": f"Re: [{issue_key}] New comment",
            "html": f"""
            <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; max-width: 600px; margin: 0 auto; color: #24292f; padding: 20px;">
                <div style="padding: 0 0 16px 0; border-bottom: 1px solid #d0d7de;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>{commenter_name}</strong> left a comment on <strong>{issue_key}</strong>
                    </p>
                </div>
                <div style="padding: 16px 0;">
                    <blockquote style="margin: 0; padding: 0 1em; color: #57606a; border-left: 0.25em solid #d0d7de;">
                        {formatted_body}
                    </blockquote>
                </div>
                <div style="padding: 16px 0;">
                    <a href="{settings.FRONTEND_URL}/{issue_key}" style="display: inline-block; padding: 5px 12px; font-size: 14px; font-weight: 500; line-height: 20px; color: #ffffff; text-decoration: none; background-color: #2da44e; border: 1px solid rgba(27,31,36,0.15); border-radius: 6px;">View it on Bugs Tracker</a>
                </div>
                <div style="padding: 16px 0; border-top: 1px solid #d0d7de; font-size: 12px; color: #57606a;">
                    <p style="margin: 0;">You are receiving this because you authored the issue or are subscribed to the thread.</p>
                </div>
            </div>
            """
        })
        print(f"Sent comment notification email to {to_email}: {r}")
    except Exception as e:
        print(f"Failed to send notification email to {to_email}: {e}")
def send_status_change_notification(to_email: str, issue_key: str, old_status: str, new_status: str):
    if not settings.RESEND_API_KEY:
        print(f"RESEND_API_KEY not set. Mock sending status change notification to {to_email}")
        return

    try:
        r = resend.Emails.send({
            "from": f"Bugs Tracker <{SENDER_EMAIL}>",
            "to": to_email,
            "subject": f"Re: [{issue_key}] Status changed",
            "html": f"""
            <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; max-width: 600px; margin: 0 auto; color: #24292f; padding: 20px;">
                <div style="padding: 0 0 16px 0; border-bottom: 1px solid #d0d7de;">
                    <p style="margin: 0; font-size: 14px;">
                        The status of <strong>{issue_key}</strong> was changed from <code style="padding: 2px 4px; background-color: rgba(175,184,193,0.2); border-radius: 6px;">{old_status}</code> to <code style="padding: 2px 4px; background-color: rgba(175,184,193,0.2); border-radius: 6px;">{new_status}</code>.
                    </p>
                </div>
                <div style="padding: 16px 0;">
                    <a href="{settings.FRONTEND_URL}/{issue_key}" style="display: inline-block; padding: 5px 12px; font-size: 14px; font-weight: 500; line-height: 20px; color: #ffffff; text-decoration: none; background-color: #2da44e; border: 1px solid rgba(27,31,36,0.15); border-radius: 6px;">View it on Bugs Tracker</a>
                </div>
                <div style="padding: 16px 0; font-size: 12px; color: #57606a;">
                    <p style="margin: 0;">You are receiving this because you authored the issue.</p>
                </div>
            </div>
            """
        })
        print(f"Sent status change notification email to {to_email}: {r}")
    except Exception as e:
        print(f"Failed to send status change notification to {to_email}: {e}")

def send_admin_notification(admin_emails: list[str], subject: str, html_body: str):
    if not settings.RESEND_API_KEY:
        print(f"RESEND_API_KEY not set. Mock sending admin notification to {admin_emails}: {subject}")
        return
        
    if not admin_emails:
        return

    try:
        r = resend.Emails.send({
            "from": f"Bugs Tracker <{SENDER_EMAIL}>",
            "to": admin_emails,
            "subject": subject,
            "html": f"""
            <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; max-width: 600px; margin: 0 auto; color: #24292f; padding: 20px;">
                <div style="padding: 0 0 16px 0; border-bottom: 1px solid #d0d7de;">
                    {html_body}
                </div>
                <div style="padding: 16px 0;">
                    <a href="{settings.FRONTEND_URL}/" style="display: inline-block; padding: 5px 12px; font-size: 14px; font-weight: 500; line-height: 20px; color: #ffffff; text-decoration: none; background-color: #2da44e; border: 1px solid rgba(27,31,36,0.15); border-radius: 6px;">View on Bugs Tracker</a>
                </div>
                <div style="padding: 16px 0; font-size: 12px; color: #57606a;">
                    <p style="margin: 0;">You are receiving this because you are an admin on Bugs Tracker.</p>
                </div>
            </div>
            """
        })
        print(f"Sent admin notification emails to {admin_emails}: {r}")
    except Exception as e:
        print(f"Failed to send admin notification emails: {e}")
