# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets to receive typing test results automatically.

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it something like "Typing Test Results"
4. In the first row, add these headers:
   - Column A: `Team Name`
   - Column B: `WPM`
   - Column C: `Accuracy`
   - Column D: `Timestamp`

## Step 2: Create Google Apps Script

1. In your Google Sheet, click on **Extensions > Apps Script**
2. Delete any existing code in the editor
3. Paste the following code:

```javascript
function doPost(e) {
  try {
    // Get the active spreadsheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Parse the incoming data
    var data = JSON.parse(e.postData.contents);

    // Format the timestamp to a readable format
    var timestamp = new Date(data.timestamp);
    var formattedTime = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

    // Append the data to the sheet
    sheet.appendRow([
      data.teamName,
      data.wpm,
      data.accuracy + '%',
      formattedTime
    ]);

    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Click **Save** (disk icon) and give your project a name like "Typing Test Recorder"

## Step 3: Deploy the Web App

1. Click on **Deploy > New deployment**
2. Click the gear icon (⚙️) next to "Select type" and choose **Web app**
3. Fill in the details:
   - **Description**: "Typing Test Results API" (or any description)
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
4. Click **Deploy**
5. You may need to authorize the script:
   - Click **Authorize access**
   - Choose your Google account
   - Click **Advanced** if you see a warning
   - Click "Go to [Your Project Name] (unsafe)"
   - Click **Allow**
6. **IMPORTANT**: Copy the Web App URL that appears (it looks like: `https://script.google.com/macros/s/AKfycby.../exec`)

## Step 4: Update Your Typing Test App Configuration

### Option A: For Vercel Deployment (Recommended)

1. After you get your Web App URL, you have two options:

   **Option 1: Update via GitHub (Easier)**
   1. Go to your GitHub repository
   2. Click on the `config.js` file
   3. Click the pencil icon (Edit)
   4. Replace `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` with your actual URL
   5. Commit the changes
   6. Vercel will automatically redeploy

   **Option 2: Update Locally**
   1. Open the `config.js` file in your project
   2. Replace `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` with your actual URL
   3. Save the file
   4. Commit and push:
      ```bash
      git add config.js
      git commit -m "Add Google Sheets URL"
      git push
      ```
   5. Vercel will automatically redeploy

Example `config.js`:
```javascript
const APP_CONFIG = {
    googleScriptUrl: 'https://script.google.com/macros/s/AKfycby.../exec'
};
```

### Option B: For Local Testing

1. Open the `config.js` file
2. Replace the URL
3. Open `index.html` in your browser

## Step 5: Test It Out

1. Once Vercel redeploys (takes about 1-2 minutes), visit your app
2. Click "Begin Quest"
3. Enter a team name
4. Complete the 30-second typing test
5. Check your Google Sheet - you should see a new row with the results!

## Troubleshooting

### Results not showing up?
- Make sure you deployed the Apps Script as a **Web app** (not API Executable)
- Ensure "Who has access" is set to **Anyone**
- Check that you copied the complete URL from the deployment
- Look at your browser's console (F12) for any error messages

### Permission errors?
- Make sure you authorized the script when deploying
- Try redeploying the script with fresh permissions

### Still having issues?
- Open the Apps Script editor
- Click **Executions** (clock icon) on the left
- Check recent execution logs for error details

## Optional: Format Your Sheet

To make your results look better:
1. Make the header row bold
2. Freeze the first row: **View > Freeze > 1 row**
3. Add alternating colors: **Format > Alternating colors**
4. Auto-resize columns: Select all columns, then **Format > Resize columns > Fit to data**

## Security Note

This setup allows anyone with your app URL to submit data to your sheet. For production use, consider:
- Adding authentication to verify legitimate submissions
- Rate limiting to prevent spam
- Adding data validation in the Apps Script
