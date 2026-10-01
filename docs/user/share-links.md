# Share a report with a link

## What it is

A share link lets you send a report from Expense Tracker to someone else. They open the link and see your report as a table.
They do not need your data or an account. You can also show a QR code, so a person can scan it with a phone camera.

Use it when you want to show your accountant a tax report, or a family member a monthly summary.

## What you need

- At least one expense in the app. Without one, the **Create link** button stays disabled and the page says "Add an expense first."
- The app opened on a website address. If you run it on your own computer (localhost), the link will only open on that same
  computer.

## Step by step

1. Open the **Cloud** menu at the top of the page, then choose the **Share links** tab.
   (You can also click **Export & share** on the Dashboard to reach the Cloud page.)

   ![Screenshot 1: the Cloud page with the Share links tab selected](../images/share-links-1.png)
   *Screenshot to add: the top menu with Cloud highlighted and the Share links tab open.*

2. Under **What to share**, pick the report: Full data, Tax report, Monthly summary or Category analysis.
3. Under **Link expires after**, pick **1 day**, **7 days**, **30 days** or **Never**.
4. Tick or untick **Let viewers download it as CSV**. If you untick it, people can only look at the report.

   ![Screenshot 2: the form with a report, an expiry and the download box chosen](../images/share-links-2.png)
   *Screenshot to add: the "Create a share link" form with Monthly summary, 7 days and the CSV box ticked.*

5. Click **Create link**. For a moment the button says "Creating link...".
6. A card appears with a QR code and the link. Use **Copy link** (the button then says "Copied") and paste the link into a
   message, or click **Open link** to see exactly what the other person will see. A person can also scan the QR code with a
   phone camera.

   ![Screenshot 3: the result card with the QR code, the link and the Copy link button](../images/share-links-3.png)
   *Screenshot to add: the result card right after creating a link.*

7. Under **Your links** you can see every link you made, with the label **Active**, **Expired** or **Revoked**.
   **Show link and QR** shows the card again.

   ![Screenshot 4: the Your links list with one active link](../images/share-links-4.png)
   *Screenshot to add: the list with at least one link and its buttons visible.*

### What the other person sees

They open the link and see the report, with the title, the table and the date the report was made. If you allowed it, there is a
**Download CSV** button.

![Screenshot 5: the shared report as the other person sees it](../images/share-links-5.png)
*Screenshot to add: the report page opened from a link, with the Download CSV button.*

## Tips

- Check the card before you send it: **Open link** shows exactly what they will see.
- Pick the shortest expiry that works for you. **1 day** is enough for most things.
- A summary report (Monthly summary or Category analysis) is smaller and easier to share than Full data.
- Untick **Let viewers download it as CSV** when the person only needs to read the numbers.
- Amounts are shown in the currency you had selected when you made the link.

## If something goes wrong

| What you see | Why | What to do |
| --- | --- | --- |
| **Create link** is greyed out | There are no expenses yet | Add an expense first |
| A message says the report has too many rows | A link can hold at most 5000 rows | Share a Monthly summary or Category analysis instead |
| A message says the report is too large | The report is too big to fit in a link | Share a summary report |
| "Link too large to keep" in your list | The link is very long, so the app did not save it | Create the link again and copy it right away |
| The other person sees "This link does not work" | The link was cut off or changed when copied | Send the whole link again, and check that nothing was removed from the end |
| They see "This link has expired" | The time you chose has passed | Create a new link |
| They see "This link was revoked" | You revoked it in this same browser | Create a new link |
| The QR area says the link is too long | Too much data for a QR code | Use **Copy link**, or share a smaller report |
| **Copy link** says "Copy failed" | The browser blocked copying | Click the link box, select all, and copy it by hand |

## What it cannot do

- **Anyone who has the link can read the report.** Do not post it somewhere public.
- **A link cannot be taken back once sent.** **Revoke (this browser)** only blocks the link in the browser where you made it. The other
  person's copy still opens on their device until it expires.
- **The expiry is a courtesy, not a lock.** The page checks the date, but it does not protect the data.
- **It is a snapshot.** If you add expenses later, old links do not change. Make a new link.
- **There is no password.**
- **The list keeps your 10 newest links.** When you create an 11th, the oldest one disappears from the list. Links you already
  sent keep working until they expire, but you can no longer see them or revoke them here.
- If you run the app on your own computer, the link only opens on that computer. It works for other people once the app is
  hosted on a website.

## Privacy

There is no server in the middle. The report is packed inside the link itself, and nothing is uploaded anywhere when you create it.
Only the people you give the link to can read it. Your list of links is saved in your own browser.
