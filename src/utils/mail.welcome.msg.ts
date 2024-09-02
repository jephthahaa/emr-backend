
// Define email options
export const patientHtml = (name: string) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Zomujo</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
                background-color: #28a745;
                color: #ffffff;
                text-align: center;
                padding: 20px 0;
            }
            .header h1 {
                margin: 0;
            }
            .content {
                padding: 20px;
            }
            .content h2 {
                color: #28a745;
            }
            .content p {
                line-height: 1.6;
            }
            .footer {
                text-align: center;
                padding: 10px 0;
                color: #777;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Zomujo</h1>
            </div>
            <div class="content">
                <h2>Dear ${name},</h2>
                <p>Thank you for registering with Zomujo! We are delighted to have you on board.</p>
                <p>At Zomujo, we are committed to providing you with the best health care services. Our platform connects you with experienced doctors and health professionals to ensure you receive the highest quality care.</p>
                <p>Here's what you can do next:</p>
                <ul>
                    <li>Explore our <a href="[Link to Services]">services</a></li>
                    <li>Find and connect with <a href="[Link to Doctors]">doctors</a></li>
                    <li>Read our latest <a href="[Link to Blog]">health articles</a></li>
                </ul>
                <p>If you have any questions or need assistance, feel free to contact our support team at <a href="mailto:support@healthfirst.com">support@zomujo.com</a>.</p>
                <p>We look forward to supporting your health journey.</p>
                <p>Best regards,</p>
                <p>The Zomujo Team</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Zomujo. All rights reserved.</p>
                <p><a href="[Link to Privacy Policy]">Privacy Policy</a> | <a href="[Link to Terms of Service]">Terms of Service</a></p>
            </div>
        </div>
    </body>
    </html>
  `
};

export const doctorsHtml = (name: string) => {
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Zomujo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #007bff;
            color: #ffffff;
            text-align: center;
            padding: 20px 0;
        }
        .header h1 {
            margin: 0;
        }
        .content {
            padding: 20px;
        }
        .content h2 {
            color: #007bff;
        }
        .content p {
            line-height: 1.6;
        }
        .footer {
            text-align: center;
            padding: 10px 0;
            color: #777;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Zomujo</h1>
        </div>
        <div class="content">
            <h2>Dear Dr. ${name},</h2>
            <p>Welcome to Zomujo! We are thrilled to have you join our network of dedicated and skilled healthcare professionals.</p>
            <p>At Zomujo, our mission is to provide exceptional healthcare services by connecting patients with top-tier doctors like you. We are committed to supporting you in delivering the best care possible.</p>
            <p>Here's what you can do next:</p>
            <ul>
                <li>Complete your <a href="[Link to Profile Setup]">profile setup</a> to help patients know more about you.</li>
                <li>Explore our <a href="[Link to Resources]">resources</a> to support your practice.</li>
                <li>Check out our <a href="[Link to Community]">community</a> to connect with other healthcare professionals.</li>
            </ul>
            <p>If you have any questions or need assistance, feel free to reach out to our support team at <a href="mailto:support@healthfirst.com">support@zomujo.com</a>.</p>
            <p>We look forward to working with you to enhance patient care and improve health outcomes.</p>
            <p>Sincerely,</p>
            <p>The Zomujo Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Zomujo. All rights reserved.</p>
            <p><a href="[Link to Privacy Policy]">Privacy Policy</a> | <a href="[Link to Terms of Service]">Terms of Service</a></p>
        </div>
    </div>
</body>
</html>
`
}

export const verificationHtml = (name: string, code: string) => {
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - Zomujo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #28a745;
            color: #ffffff;
            text-align: center;
            padding: 20px 0;
        }
        .header h1 {
            margin: 0;
        }
        .content {
            padding: 20px;
        }
        .content h2 {
            color: #28a745;
        }
        .content p {
            line-height: 1.6;
        }
        .verification-code {
            display: inline-block;
            padding: 10px 20px;
            margin: 20px 0;
            font-size: 16px;
            background-color: #f0f0f0;
            border: 1px solid #cccccc;
            border-radius: 5px;
        }
        .footer {
            text-align: center;
            padding: 10px 0;
            color: #777;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Zomujo</h1>
        </div>
        <div class="content">
            <h2>Hello ${name},</h2>
            <p>Thank you for registering with Zomujo! To complete your registration, please use the following verification code:</p>
            <p class="verification-code">${code}</p>
            <p>If you did not sign up for a Zomujo account, please ignore this email.</p>
            <p>Thank you for choosing Zomujo. We look forward to supporting your health journey.</p>
            <p>Best regards,</p>
            <p>The Zomujo Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Zomujo. All rights reserved.</p>
            <p><a href="[Link to Privacy Policy]">Privacy Policy</a> | <a href="[Link to Terms of Service]">Terms of Service</a></p>
        </div>
    </div>
</body>
</html>
`
}