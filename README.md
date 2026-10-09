# Codespaces Remote Browser

A small, single-tab browser prototype that runs Chromium in a GitHub Codespace and displays its page in a web interface.

**Scope:** The browser is restricted to one HTTPS origin configured with `ALLOWED_ORIGIN`. It is not an unrestricted proxy. Sites that depend on resources from other origins may not work correctly.

## Requirements

- A GitHub repository containing this app
- A GitHub Codespace for that repository
- Node.js and npm in the Codespace

## Start it in GitHub Codespaces

1. Open this repository on GitHub.
2. Select **Code → Codespaces → Create codespace on your branch**. GitHub opens the Codespace in the browser-based editor.
3. In the Codespace editor, open **Terminal → New Terminal**.
4. Install the Node dependencies and Chromium:

   ```bash
   npm install
   npx playwright install --with-deps chromium
   ```

   The Chromium install is generally only needed once for a Codespace.

5. Set the permitted destination to an HTTPS origin you own or are authorized to test. Include the scheme and hostname, but no page path:

   ```bash
   export ALLOWED_ORIGIN="https://test.yourdomain.com"
   ```

   Use the exact origin, including any subdomain. For example, `https://test.yourdomain.com` and `https://www.test.yourdomain.com` are different origins.

6. Start the app:

   ```bash
   npm start
   ```

   Keep this terminal running while you use the browser.

## Open the app

1. In the Codespace editor, select the **Ports** tab.
2. Find port `8000`. If it is not listed, choose **Add port** and enter `8000`.
3. Keep the port's visibility set to **Private**.
4. Select **Open in Browser** for port `8000`.

The Codespaces URL is the address of this app. You do not need to buy or configure a separate domain for it.

## Use the browser

- Enter an HTTPS URL on the configured origin in the address bar and select **Go**.
- Use **Back**, **Forward**, and **Reload** in the toolbar.
- Click the displayed page to focus it, then use the mouse and keyboard to interact.
- The displayed screenshot refreshes periodically.

The remote browser only allows the configured origin. To test another site you own or are authorized to use, stop the server, change `ALLOWED_ORIGIN`, and start it again.

## Stop the app

In the terminal running the server, press **Ctrl+C**.

## Troubleshooting

- **`npm start` says the start script is missing:** Add the project’s start script to `package.json`, for example:

  ```bash
  npm pkg set type=module scripts.start="node server.mjs"
  ```

- **The page cannot reach the browser server:** Confirm the server is still running and that port `8000` appears in the Ports tab.
- **The app shows a missing-file error:** Confirm `public/index.html` exists and that the server serves the `public` directory.
- **Chromium is missing:** Run `npx playwright install --with-deps chromium` again.
- **A destination is rejected:** Confirm the URL uses HTTPS and its origin exactly matches `ALLOWED_ORIGIN`.

## Security notes

- Keep the forwarded port private while developing. Do not share the Codespace URL or make the port public for an unrestricted proxy.
- Only use the app with sites you own or are authorized to test.
- Avoid entering passwords or other sensitive information into this prototype.
- Save and commit your repository changes to keep the code in GitHub.
