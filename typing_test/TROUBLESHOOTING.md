# Troubleshooting Google Sheets Integration

## Data Not Appearing in Spreadsheet?

Follow these steps to diagnose and fix the issue:

### Step 1: Verify Your Google Apps Script

1. Open your Google Sheet
2. Go to **Extensions > Apps Script**
3. Make sure you have this EXACT code:

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

4. Click **Save** (💾)

### Step 2: Check Your Deployment Settings

1. Click **Deploy > Manage deployments**
2. Click the ✏️ (Edit) icon on your deployment
3. Verify these settings:
   - **Execute as**: Me (your email)
   - **Who has access**: **Anyone** ⚠️ This is critical!
4. If you changed anything, click **Deploy**
5. Copy the NEW Web App URL if it changed

### Step 3: Verify the URL in config.js

1. Open `config.js` in your project
2. Make sure the URL matches EXACTLY what you copied from the deployment
3. The URL should look like: `https://script.google.com/macros/s/AKfycby.../exec`
4. Make sure it ends with `/exec` (not `/dev`)

### Step 4: Test the Deployment

#### Option A: Test via Browser Console

1. Open your typing test app in the browser
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Complete a typing test
5. Look for these messages:
   - `Sending data to Google Sheets: {teamName: "...", wpm: ..., accuracy: ..., timestamp: "..."}`
   - `URL: https://script.google.com/macros/s/...`
   - `Response received: Response {...}`

#### Option B: Test the Script Directly

1. Open a new tab
2. Open Developer Tools (F12) > Console tab
3. Paste and run this code (replace YOUR_URL with your actual URL):

```javascript
fetch('YOUR_GOOGLE_APPS_SCRIPT_URL_HERE', {
    method: 'POST',
    mode: 'no-cors',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        teamName: 'Test Team',
        wpm: 50,
        accuracy: 95,
        timestamp: new Date().toISOString()
    })
})
.then(() => console.log('Request sent'))
.catch(error => console.error('Error:', error));
```

4. Check your Google Sheet - a row should appear with "Test Team"

### Step 5: Check Script Execution Logs

1. In Apps Script editor, click **Executions** (⏱️ clock icon) on the left
2. Look for recent executions
3. Check if there are any errors
4. If you see "Authorization required", redeploy the script:
   - Click **Deploy > New deployment**
   - Select **Web app**
   - Click **Deploy**
   - Authorize again

### Common Issues and Solutions

#### Issue: "Who has access" is set to "Only myself"
**Solution**: Change it to "Anyone" and redeploy

#### Issue: Using `/dev` URL instead of `/exec`
**Solution**: Make sure you're using the deployment URL, not the development URL

#### Issue: Script not authorized
**Solution**:
1. Go to **Deploy > New deployment**
2. Complete the authorization flow
3. If you see "This app isn't verified", click **Advanced** > "Go to [Project Name] (unsafe)"

#### Issue: Wrong sheet or wrong tab
**Solution**: The script writes to the "active sheet". Make sure:
- You're on the correct tab in your Google Sheet
- Or modify the script to use a specific sheet name:
```javascript
var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
```

#### Issue: Data format is wrong
**Solution**: Make sure your sheet has these column headers in row 1:
- Column A: Team Name
- Column B: WPM
- Column C: Accuracy
- Column D: Timestamp

### Still Not Working?

1. **Check browser console** for any error messages (F12 > Console tab)
2. **Check Apps Script executions** for error logs
3. **Try the direct test** from Option B above
4. **Verify permissions** - make sure the script can edit the spreadsheet
5. **Try redeploying** - Delete the old deployment and create a new one

### Success Indicators

When working correctly, you should see:
- ✅ Browser console shows "Sending data to Google Sheets"
- ✅ Browser console shows "Response received"
- ✅ Apps Script Executions show successful runs
- ✅ New rows appear in your Google Sheet immediately after completing tests

### Security Notes

#### Protecting Your Spreadsheet
- **Never share the Google Sheet URL** with users - keep it private!
- Only share your Vercel typing test app URL
- Users don't need access to the sheet - the script handles everything
- The Apps Script runs as you and can write to your private sheet

#### Preventing Data Tampering
The current setup allows anyone with the app URL to submit data. To add more security:

1. **Add a secret key validation** in Apps Script:
```javascript
function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  // Add secret key validation
  if (data.secretKey !== 'YOUR_SECRET_KEY_HERE') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Unauthorized'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Continue with normal processing...
}
```

2. **Add rate limiting** - Track IP addresses or timestamps to prevent spam

3. **Validate data** - Check ranges (e.g., WPM between 0-200, accuracy 0-100)

4. **Use separate sheets** for test data vs production data

5. **Protect the sheet ranges**:
   - In Google Sheets: Data > Protect sheets and ranges
   - Set to "Only you" can edit
