# QR Code Generation Prompt

**User:**
```
People need to join these polls quickly. Add a QR code on the Presenter view that takes them directly to `/?voterId=POLL_ID`. Use the `qrcode` npm package. Also, put a small 'Share' button on the voter's screen that pops up a modal with the same QR code so they can easily show their friends sitting next to them.
```

**Context:**
This imaginary prompt reflects the integration of the `qrcode` library to handle instant mobile access. The AI would write the `useEffect` hooks to generate the base64 data URLs for the QR codes whenever the `pollId` changes.
