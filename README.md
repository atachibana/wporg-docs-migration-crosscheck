# WordPress.org Docs migration cross-check helper

This mini-project aims to help automate status cross-checks for the WordPress.org Codex to DevHub migration efforts.

Simply put, it fetches the migration Google Sheet and checks each Codex link for a redirect to DevHub. If there are
inconsistencies between the sheet and the actual live status of the pages, it can update them in the sheet.

# Running

1. Set up a Google developer project at https://console.developers.google.com/
2. Activate the Google Sheets API
3. Go to Credentials and set up a Service account
4. Take the email address of the Service account and give it access in your Google Sheet via Sharing
5. Download the resulting JSON with credentials to this project under credentials/
6. Duplicate `config.js.sample` to `config.js` and update the credentials file path
7. Run `retrieve-gsheet.js`, `verify-functions.js` and finally `update-sheet.js` (the latter only if you've given write permissions to the Service Account and you'd like it to update the status of the functions in the sheet) in this order
