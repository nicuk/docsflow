import { Resend } from 'resend';

// Initialize Resend client (fallback for development)
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface InvitationEmailData {
  inviteeEmail: string;
  inviterName: string;
  tenantName: string;
  invitationUrl: string;
  role: string;
  accessLevel: number;
}

// Email templates
export function createInvitationEmailTemplate(data: InvitationEmailData): EmailTemplate {
  const accessLevelNames: Record<number, string> = {
    1: 'Public Access',
    2: 'Customer Access', 
    3: 'Technician Access',
    4: 'Manager Access',
    5: 'Executive Access'
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're invited to join ${data.tenantName}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
          border-radius: 8px 8px 0 0; 
        }
        .content { 
          background: #ffffff; 
          padding: 30px; 
          border: 1px solid #e1e5e9; 
          border-radius: 0 0 8px 8px; 
        }
        .cta-button { 
          display: inline-block; 
          background: #667eea; 
          color: white; 
          padding: 12px 30px; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: 600; 
          margin: 20px 0; 
        }
        .cta-button:hover { 
          background: #5a6fd8; 
        }
        .details { 
          background: #f8f9fa; 
          padding: 20px; 
          border-radius: 6px; 
          margin: 20px 0; 
        }
        .footer { 
          text-align: center; 
          color: #6c757d; 
          font-size: 14px; 
          margin-top: 30px; 
        }
        .security-note {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 You're Invited!</h1>
        <p>Join ${data.tenantName} on our AI-powered platform</p>
      </div>
      
      <div class="content">
        <p>Hi there!</p>
        
        <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.tenantName}</strong> on our AI Lead Router platform.</p>
        
        <div class="details">
          <h3>📋 Your Access Details</h3>
          <ul>
            <li><strong>Organization:</strong> ${data.tenantName}</li>
            <li><strong>Role:</strong> ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}</li>
            <li><strong>Access Level:</strong> Level ${data.accessLevel} (${accessLevelNames[data.accessLevel] || 'Standard Access'})</li>
            <li><strong>Email:</strong> ${data.inviteeEmail}</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${data.invitationUrl}" class="cta-button">Accept Invitation</a>
        </div>

        <div class="security-note">
          🔒 <strong>Security Note:</strong> This invitation link is secure and will expire in 7 days. Only you can access it with this email address.
        </div>

        <h3>🚀 What you'll get access to:</h3>
        <ul>
          <li>AI-powered document intelligence</li>
          <li>Smart lead routing and management</li>
          <li>Real-time analytics and insights</li>
          <li>Multi-channel communication tools</li>
          ${data.accessLevel >= 3 ? '<li>Advanced technical documentation</li>' : ''}
          ${data.accessLevel >= 4 ? '<li>Management reports and metrics</li>' : ''}
          ${data.accessLevel >= 5 ? '<li>Executive dashboards and strategic data</li>' : ''}
        </ul>

        <p>If you have any questions, feel free to reply to this email or contact your team administrator.</p>

        <p>Welcome to the team!</p>
        <p>The AI Lead Router Team</p>
      </div>

      <div class="footer">
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        <p>This invitation expires in 7 days for security reasons.</p>
      </div>
    </body>
    </html>
  `;

  return {
    to: data.inviteeEmail,
    subject: `You're invited to join ${data.tenantName} - AI Lead Router`,
    html,
    from: process.env.EMAIL_FROM || 'noreply@ai-lead-router.com'
  };
}

// Send invitation email
export async function sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!resend) {
      // Development fallback - log the email content
      console.log('📧 INVITATION EMAIL (Development Mode)');
      console.log('To:', data.inviteeEmail);
      console.log('From:', data.inviterName);
      console.log('Tenant:', data.tenantName);
      console.log('URL:', data.invitationUrl);
      console.log('Role:', data.role);
      console.log('Access Level:', data.accessLevel);
      
      return { 
        success: true, 
        id: `dev-email-${Date.now()}`,
        error: 'Development mode - email logged to console'
      };
    }

    const template = createInvitationEmailTemplate(data);
    
    const response = await resend.emails.send({
      from: template.from!,
      to: template.to,
      subject: template.subject,
      html: template.html
    });

    if (response.error) {
      console.error('❌ Failed to send invitation email:', response.error);
      return { 
        success: false, 
        error: response.error.message || 'Failed to send email'
      };
    }

    console.log('✅ Invitation email sent successfully:', response.data?.id);
    return { 
      success: true, 
      id: response.data?.id 
    };

  } catch (error) {
    console.error('❌ Error sending invitation email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send welcome email after user accepts invitation
export async function sendWelcomeEmail(data: {
  email: string;
  name: string;
  tenantName: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!resend) {
      console.log('📧 WELCOME EMAIL (Development Mode)');
      console.log('To:', data.email);
      console.log('Name:', data.name);
      console.log('Tenant:', data.tenantName);
      console.log('Dashboard:', data.dashboardUrl);
      
      return { 
        success: true, 
        id: `dev-welcome-${Date.now()}`
      };
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to ${data.tenantName}!</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 8px 8px; }
          .cta-button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Welcome to ${data.tenantName}!</h1>
          <p>You're all set up and ready to go</p>
        </div>
        
        <div class="content">
          <p>Hi ${data.name},</p>
          
          <p>Welcome to <strong>${data.tenantName}</strong>! Your account has been successfully activated.</p>
          
          <div style="text-align: center;">
            <a href="${data.dashboardUrl}" class="cta-button">Access Your Dashboard</a>
          </div>

          <h3>🚀 Next Steps:</h3>
          <ul>
            <li>Explore your dashboard and available features</li>
            <li>Upload documents to start using AI intelligence</li>
            <li>Connect with your team members</li>
            <li>Set up your preferences and notifications</li>
          </ul>

          <p>If you need any help getting started, don't hesitate to reach out to your team administrator.</p>

          <p>Best regards,<br>The AI Lead Router Team</p>
        </div>

        <div class="footer">
          <p>Questions? Contact your team administrator or reply to this email.</p>
        </div>
      </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@ai-lead-router.com',
      to: data.email,
      subject: `Welcome to ${data.tenantName}! 🎉`,
      html
    });

    if (response.error) {
      console.error('❌ Failed to send welcome email:', response.error);
      return { 
        success: false, 
        error: response.error.message || 'Failed to send email'
      };
    }

    console.log('✅ Welcome email sent successfully:', response.data?.id);
    return { 
      success: true, 
      id: response.data?.id 
    };

  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 