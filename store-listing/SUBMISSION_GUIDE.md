# Submit Hourfolk to the Chrome Web Store

## Before opening the dashboard

1. Confirm the hosted [privacy policy](https://hourfolk.abdulsamii.com/privacy-policy.html) and [terms and conditions](https://hourfolk.abdulsamii.com/terms.html) open publicly.
2. Monitor the [GitHub issue tracker](https://github.com/jalasem/hourfolk-chrome-extension/issues) used as the support URL.
3. Decide whether the publisher is a **Trader** or **Non-Trader**. This is a legal/business classification you must make; trader contact details are displayed publicly.
4. Keep `release/hourfolk-0.1.0-chrome.zip` and the files in `store-listing/assets/` ready.

## Register and configure the publisher

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Register the developer account, accept the agreement, and pay Google’s one-time registration fee.
3. In **Account**, set the publisher name and verify the contact email.
4. Complete the dashboard’s Trader/Non-Trader declaration and any identity checks it requests.

Use a durable Google account and an email address you monitor. The publisher account email cannot simply be swapped later without transferring the item.

## Upload the extension

1. Click **Add new item**.
2. Upload `release/hourfolk-0.1.0-chrome.zip`.
3. Confirm the automated installation check passes.
4. If you change anything inside the extension after uploading, increment `version` in `package.json`, rerun `npm run package:store`, and upload the new ZIP.

The ZIP already has `manifest.json` at its root. Do not zip the `dist` directory itself as a containing folder.

## Complete Store Listing

Copy the text from `STORE_LISTING.md`:

- Category: **Productivity**
- Language: **English**
- Detailed description: use the prepared description verbatim
- Store icon: `assets/icon-128.png`
- Small promo tile: `assets/promo-small-440x280.png`
- Screenshots: upload `screenshot-01-clocks.png`, `screenshot-02-plan.png`, and `screenshot-03-reminders.png` in that order
- Privacy policy URL: `https://hourfolk.abdulsamii.com/privacy-policy.html`
- Support URL: `https://github.com/jalasem/hourfolk-chrome-extension/issues`
- Homepage URL: `https://hourfolk.abdulsamii.com/`

The screenshots are 1280×800 and the small promo tile is 440×280, matching Chrome Web Store dimensions.

## Complete Privacy

1. Single purpose: paste the prepared single-purpose statement.
2. Permission justifications: paste each matching justification for `storage`, `alarms`, `notifications`, and `sidePanel`.
3. Data collection: select **No** for all categories. Hourfolk retains user-entered state locally and sends nothing to the developer or a third party.
4. Remote code: select **No**.
5. Certify the Limited Use requirements.

Make sure the answers remain consistent with the hosted privacy policy. If future versions add analytics, sync, accounts, or any network transmission, update both disclosures before publishing that version.

## Distribution and review

1. Select **Public** visibility and **All regions**, unless you intentionally want a smaller launch.
2. Declare no in-app purchases.
3. Test instructions are optional because Hourfolk has no login, but the prepared reviewer steps can make verification faster.
4. Click **Submit for Review**.
5. For a controlled launch, turn off automatic publishing in the confirmation dialog. After approval, publish manually within the dashboard’s allowed staging window.

## Release command for future versions

```bash
# Update package.json version first
npm run icons
npm run store:assets
npm run package:store
npm test
npm run test:e2e
```

`package:store` refuses to package CRXJS development output that still points at localhost.

## Official references

- [Register a developer account](https://developer.chrome.com/docs/webstore/register)
- [Set up the publisher account](https://developer.chrome.com/docs/webstore/set-up-account/)
- [Prepare and ZIP the extension](https://developer.chrome.com/docs/webstore/prepare)
- [Complete the store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Image requirements](https://developer.chrome.com/docs/webstore/images)
- [Complete privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Choose visibility and regions](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)
- [Publish for the first time](https://developer.chrome.com/docs/webstore/publish)
