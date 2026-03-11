import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInviteEmail(
  to: string,
  inviteLink: string,
  orgName: string,
  role: string
) {
  try {
    await resend.emails.send({
      from: 'TechTrack <onboarding@resend.dev>',
      to,
      subject: `You've been invited to join ${orgName} on TechTrack`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #2563eb; margin-bottom: 20px;">Welcome to TechTrack!</h1>
              
              <p>You've been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
              
              <p>TechTrack is a device assignment and tracking system that helps organizations manage their device inventory and assignments.</p>
              
              <div style="margin: 30px 0;">
                <a href="${inviteLink}" 
                   style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                This invitation link will expire in 48 hours.
              </p>
              
              <p style="color: #666; font-size: 14px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                TechTrack - Device Assignment & Tracking System
              </p>
            </div>
          </body>
        </html>
      `
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}
