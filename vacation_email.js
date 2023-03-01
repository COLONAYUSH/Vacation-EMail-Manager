const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_SECRET_PATH = './client_secret.json';
const USER_EMAIL = 'ayushkumar.ei19@bmsce.ac.in';
const LABEL_NAME = 'Vacation Auto Reply';

// Set up OAuth2.0 client
const oauth2Client = new OAuth2Client({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: 'http://localhost:3000/oauth2callback'
});

// Get authorization URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.modify']
});

console.log('Authorize this app by visiting this URL:', authUrl);

// Get the access token
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    oauth2Client.setCredentials(token);
    console.log('Access token retrieved successfully');
    // Call the Gmail API to fetch new emails and send replies
    setInterval(fetchNewEmailsAndSendReplies, getRandomInterval());
  });
});

// Function to fetch new emails and send replies
async function fetchNewEmailsAndSendReplies() {
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    // Fetch new emails
    const response = await gmail.users.messages.list({
      userId: USER_EMAIL,
      q: 'is:unread', // Only fetch unread emails
      includeSpamTrash: false, // Exclude spam and trash folders
    });
    const messages = response.data.messages;
    if (messages.length > 0) {
      console.log(`Found ${messages.length} new emails`);
      for (const message of messages) {
        // Get the thread ID of the email
        const threadId = message.threadId;
        // Check if the email has already been replied to
        const isReplied = await isEmailReplied(threadId);
        if (!isReplied) {
          // Get the email details
          const email = await getEmailDetails(gmail, message.id);
          // Send a reply to the email
          await sendReply(gmail, email);
          // Add a label to the email and move it to the label
          await addLabelToEmail(gmail, message.id);
          console.log(`Replied to email from ${email.from} with subject "${email.subject}"`);
        } else {
          console.log(`Email from thread ID ${threadId} has already been replied to`);
        }
      }
    } else {
      console.log('No new emails found');
    }
} catch (err) {
    console.error('Error occurred:', err);
    }
    }
    
    // Function to check if an email has been replied to
    async function isEmailReplied(threadId) {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    // Fetch all emails in the thread
    const response = await gmail.users.threads.get({
    userId: USER_EMAIL,
    id: threadId,
    format: 'full',
    });
    const emails = response.data.messages;
    for (const email of emails) {
    // Check if the email was sent by the user
    if (email.payload.headers.find((header) => header.name === 'From' && header.value.includes(USER_EMAIL))) {
    // Check if the email has a reply
    if (email.payload.headers.find((header) => header.name === 'In-Reply-To')) {
    return true;
    }
    }
    }
    return false;
    }
    
    // Function to get the details of an email
    async function getEmailDetails(gmail, messageId) {
    const response = await gmail.users.messages.get({
    userId: USER_EMAIL,
    id: messageId,
    });
    const email = {
    id: response.data.id,
    threadId: response.data.threadId,
    subject: '',
    from: '',
    to: '',
    body: '',
    };
    const headers = response.data.payload.headers;
    for (const header of headers) {
    if (header.name === 'Subject') {
    email.subject = header.value;
    } else if (header.name === 'From') {
    email.from = header.value;
    } else if (header.name === 'To') {
    email.to = header.value;
    }
    }
    // Get the body of the email
    const body = response.data.payload.parts.filter((part) => part.mimeType === 'text/plain');
    if (body.length > 0) {
    email.body = Buffer.from(body[0].body.data, 'base64').toString();
    }
    return email;
    }
    
    // Function to send a reply to an email
// Function to send a reply to an email
async function sendReplyToEmail(gmail, threadId, messageId, from, to, subject) {
    const message = `Hello,
  
  Thank you for your email. This is an automated response to let you know that I am currently out of office on vacation.
  
  I will be back on March 10th, 2023. If you need immediate assistance, please contact my colleague at [insert email/contact information].
  
  Thank you for your understanding.
  
  Best regards,
  [Your name]`;
    // Create the MIME message
    const utf8Message = Buffer.from(message, 'utf-8');
    const encodedMessage = utf8Message.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const mimeMessage = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodedMessage,
    ].join('\n');
    // Send the reply
    const response = await gmail.users.messages.send({
      userId: USER_EMAIL,
      requestBody: {
        threadId: threadId,
        raw: Buffer.from(mimeMessage).toString('base64'),
      },
    });
    console.log(`Sent reply to email with messageId ${messageId}`);
    // Add a label to the email
    await addLabelToEmail(gmail, messageId);
  }
  

// Function to add a label to an email
async function addLabelToEmail(gmail, messageId) {
const labelName = 'AutoReplied';
const labelId = await getOrCreateLabel(gmail, labelName);
await gmail.users.messages.modify({
userId: USER_EMAIL,
id: messageId,
requestBody: {
addLabelIds: [labelId],
},
});
}

// Function to get or create a label
async function getOrCreateLabel(gmail, labelName) {
const response = await gmail.users.labels.list({ userId: USER_EMAIL });
const labels = response.data.labels;
const existingLabel = labels.find((label) => label.name === labelName);
if (existingLabel) {
return existingLabel.id;
} else {
const response = await gmail.users.labels.create({
userId: USER_EMAIL,
requestBody: {
name: labelName,
labelListVisibility: 'labelShow',
messageListVisibility: 'show',
},
});
return response.data.id;
}
}

// Function to start the app
async function startApp() {
console.log('Starting app...');
// Authorize the app with Google
await authorize();
// Start checking for new emails in random intervals
setInterval(checkForNewEmails, getRandomInt(45, 120) * 1000);
}

// Start the app
startApp();