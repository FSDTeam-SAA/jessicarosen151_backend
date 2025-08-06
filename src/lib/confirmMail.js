const verificationEmailTemplate = (email, otp) => {
  return `
  <style>
    * {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }

    .container {
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .header {
      background-color: #f9f9f9;
      padding: 20px;
      text-align: center;
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
    }

    .content {
      padding: 20px;
    }

    .content p {
      font-size: 16px;
      line-height: 1.5;
    }

    .content a {
      text-decoration: none;
      color: #007bff;
    }

    .footer {
      background-color: #f9f9f9;
      padding: 20px;
      text-align: center;
      color: #666;
    }
  </style>

  <div class="container">
    <div class="header">
      <h1>Verify Your Email Address</h1>
    </div>

    <div class="content">
      <p>Hi ${email},</p>
      <p>Thank you for registering for an account. To complete the registration process, please enter the verification code below:</p>
      <p><strong>${otp}</strong></p>
      <p>If you didn't request this email, please ignore it.</p>
    </div>

    <div class="footer">
      <p>&copy; 2025 lawbie.com All rights reserved.</p>
    </div>
  </div>
  `;
};


export default verificationEmailTemplate;
