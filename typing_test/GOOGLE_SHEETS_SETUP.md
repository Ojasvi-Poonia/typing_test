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

    // Check for duplicate entries (same team, WPM, accuracy within last 5 seconds)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var lastEntry = sheet.getRange(lastRow, 1, 1, 4).getValues()[0];
      var lastTeam = lastEntry[0];
      var lastWPM = lastEntry[1];
      var lastAccuracy = parseInt(lastEntry[2]); // Remove % if exists
      var lastTime = new Date(lastEntry[3]);

      var timeDiff = Math.abs(timestamp - lastTime) / 1000; // seconds

      // If duplicate (same data within 5 seconds), don't add
      if (lastTeam === data.teamName &&
          lastWPM === data.wpm &&
          lastAccuracy === data.accuracy &&
          timeDiff < 5) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'duplicate' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

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

## Step 6: Protect Your Spreadsheet (IMPORTANT!)

To prevent users from editing or viewing the spreadsheet directly:

### Option 1: Keep the Spreadsheet Private (Recommended)
1. **Do NOT share the Google Sheet link with anyone**
2. Only share your Vercel app URL
3. The Google Apps Script can write to the sheet even though users can't access it
4. Only you (the sheet owner) can view the results

### Option 2: Share View-Only Access (If you want others to see results)
1. In your Google Sheet, click **Share** (top right)
2. Click **Change to anyone with the link**
3. Set permissions to **Viewer** (not Editor!)
4. Click **Copy link**
5. Share this link separately from your typing test app

### Option 3: Protect the Sheet from Edits
1. Select all cells (click the square at top-left corner)
2. Go to **Data > Protect sheets and ranges**
3. Click **Set permissions**
4. Select **Restrict who can edit this range**
5. Choose **Only you**
6. Click **Done**

**Important**: Never put the Google Sheet URL in your typing test app. The Apps Script handles all data submission securely.

## Optional: Format Your Sheet

To make your results look better:
1. Make the header row bold
2. Freeze the first row: **View > Freeze > 1 row**
3. Add alternating colors: **Format > Alternating colors**
4. Auto-resize columns: Select all columns, then **Format > Resize columns > Fit to data**
5. Sort by WPM: Select data range, **Data > Sort range > Sort by column B (WPM), Z→A**

## Security Best Practices

✅ **DO:**
- Keep your Google Sheet private (don't share the link publicly)
- Only share your Vercel typing test app URL
- Protect sheet ranges from editing
- Regularly review the data for spam/invalid entries
- Consider making a copy/backup of important data

❌ **DON'T:**
- Share the Google Sheet URL publicly
- Put the Google Sheet URL in your app code
- Give "Editor" permissions to others
- Share the Google Apps Script Web App URL (keep it in config.js only)

## How It Works Securely

1. Users access your Vercel typing test app
2. They enter team name and complete the test
3. The app sends data to Google Apps Script (via the Web App URL)
4. Google Apps Script authenticates as YOU and writes to YOUR sheet
5. Users never see or access your Google Sheet directly

This way, only authorized writes happen through the script, but users can't view or edit the sheet!
