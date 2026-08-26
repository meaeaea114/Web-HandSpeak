export interface ApprovalEmailOptions {
  fullName: string;
  notificationEmail: string;
  loginEmail?: string;
  loginUrl: string;
}

export interface RejectionEmailOptions {
  fullName: string;
  notificationEmail: string;
  loginEmail?: string;
  rejectionReason: string;
  reapplyUrl: string;
  loginUrl: string;
}

export function buildApprovalEmail(options: ApprovalEmailOptions) {
  const { fullName, loginEmail, notificationEmail, loginUrl } = options;
  const accountEmail = loginEmail || notificationEmail;

  const subject = "HandSpeak Account Registration Approved";
  const text = `Hello ${fullName},\n\nYour registration request for the HandSpeak Portal has been reviewed and APPROVED.\n\nAuthorized Account Email: ${accountEmail}\n\nYou may now sign in to your dashboard here:\n${loginUrl}\n\nBest regards,\nThe HandSpeak Administration Team`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Approved</title>
    </head>
    <body style="margin: 0; padding: 32px 16px; background-color: #f7f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(71, 35, 12, 0.08); border: 1px solid #ede8de;">
        
        <!-- Header Banner with Warm Amber Gradient -->
        <tr>
          <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 36px; text-align: left;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">HandSpeak</h1>
                  <div style="display: inline-block; margin-top: 8px; background-color: rgba(255, 255, 255, 0.25); border: 1px solid rgba(255, 255, 255, 0.4); padding: 4px 12px; border-radius: 9999px;">
                    <span style="font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.08em;">Registration Approved</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body Content -->
        <tr>
          <td style="padding: 36px 36px 24px 36px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #292524;">
              Hello <span style="color: #b45309;">${fullName}</span>,
            </p>
            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.65; color: #57534e;">
              We are pleased to inform you that your registration access request has been reviewed and <strong style="color: #16a34a;">approved</strong> by the administrator. Your profile is now active on the platform.
            </p>

            <!-- Account Summary Card -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf8f5; border: 1px solid #e7e0d3; border-radius: 14px; margin-bottom: 28px;">
              <tr>
                <td style="padding: 18px 20px;">
                  <span style="display: block; font-size: 11px; font-weight: 800; color: #8c785f; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">Authorized Login Email</span>
                  <span style="display: block; font-size: 15px; font-weight: 700; color: #1c1917;">${accountEmail}</span>
                  <div style="margin-top: 10px; display: inline-block; background-color: #dcfce7; border: 1px solid #bbf7d0; padding: 2px 10px; border-radius: 9999px;">
                    <span style="font-size: 11px; font-weight: 700; color: #15803d;">Status: Active</span>
                  </div>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
              <tr>
                <td align="center">
                  <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%); color: #ffffff; font-size: 13px; font-weight: 800; text-decoration: none; padding: 14px 38px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.06em; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35);">
                    Sign In to Portal
                  </a>
                </td>
              </tr>
            </table>

            <hr style="border: none; border-top: 1px solid #ede8de; margin: 0 0 20px 0;" />

            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #a8a29e;">
              If you have questions regarding your assigned classes or roles, please contact your department coordinator.<br/><br/>
              Best regards,<br/>
              <strong style="color: #44403c;">HandSpeak Administration Team</strong>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return { subject, text, html };
}

export function buildRejectionEmail(options: RejectionEmailOptions) {
  const { fullName, loginEmail, notificationEmail, rejectionReason, reapplyUrl } = options;
  const accountEmail = loginEmail || notificationEmail;

  const subject = "HandSpeak Account Registration Request Declined";
  const text = `Hello ${fullName},\n\nThank you for your submission. Following administrator review, your registration access request for ${accountEmail} has been DECLINED.\n\nFeedback / Reason:\n"${rejectionReason}"\n\nSystem access is not granted. If you wish to re-submit with updated documents, please visit:\n${reapplyUrl}\n\nBest regards,\nThe HandSpeak Administration Team`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Registration Request Declined</title>
    </head>
    <body style="margin: 0; padding: 32px 16px; background-color: #f7f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(71, 35, 12, 0.08); border: 1px solid #ede8de;">
        
        <!-- Header Banner with Muted Dark Header & Red Badge -->
        <tr>
          <td style="background-color: #292524; padding: 32px 36px; text-align: left;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">HandSpeak</h1>
                  <div style="display: inline-block; margin-top: 8px; background-color: #fee2e2; border: 1px solid #fca5a5; padding: 4px 12px; border-radius: 9999px;">
                    <span style="font-size: 11px; font-weight: 800; color: #dc2626; text-transform: uppercase; letter-spacing: 0.08em;">Registration Request Declined</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body Content -->
        <tr>
          <td style="padding: 36px 36px 24px 36px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #292524;">
              Hello <span style="color: #b45309;">${fullName}</span>,
            </p>
            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.65; color: #57534e;">
              Thank you for submitting your filing for the HandSpeak Portal. Following administrative evaluation, we regret to inform you that your registration request for <strong style="color: #1c1917;">${accountEmail}</strong> was <strong>declined</strong>.
            </p>

            <!-- Administrator Feedback Card -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff7ed; border-left: 4px solid #f97316; border-top: 1px solid #ffedd5; border-right: 1px solid #ffedd5; border-bottom: 1px solid #ffedd5; border-radius: 12px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 18px 20px;">
                  <span style="display: block; font-size: 11px; font-weight: 800; color: #c2410c; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Administrator Feedback / Reason</span>
                  <p style="margin: 0; font-size: 14px; line-height: 1.55; color: #9a3412; font-weight: 500; font-style: italic;">
                    &ldquo;${rejectionReason}&rdquo;
                  </p>
                </td>
              </tr>
            </table>

            <!-- Access Status Notice -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf8f5; border: 1px solid #e7e0d3; border-radius: 12px; margin-bottom: 28px;">
              <tr>
                <td style="padding: 14px 18px;">
                  <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #78716c;">
                    <strong style="color: #44403c;">Access Status:</strong> System access is not granted and your account remains inactive. You cannot sign in with these credentials at this time.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Action Button -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
              <tr>
                <td align="center">
                  <a href="${reapplyUrl}" style="display: inline-block; background-color: #f5f5f4; border: 1px solid #d6d3d1; color: #292524; font-size: 13px; font-weight: 800; text-decoration: none; padding: 13px 34px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.06em;">
                    Submit a New Application
                  </a>
                </td>
              </tr>
            </table>

            <hr style="border: none; border-top: 1px solid #ede8de; margin: 0 0 20px 0;" />

            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #a8a29e;">
              If you believe this decision was made in error, please coordinate directly with the administrative office.<br/><br/>
              Best regards,<br/>
              <strong style="color: #44403c;">HandSpeak Administration Team</strong>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return { subject, text, html };
}