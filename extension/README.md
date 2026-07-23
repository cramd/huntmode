# HuntMode Chrome Extension

Save job postings to [huntmode.ca](https://huntmode.ca) from any page.

## Install (development)

1. Open Chrome → **Extensions** → **Manage Extensions** → enable **Developer mode**
2. Click **Load unpacked** and select this `extension/` folder
3. On huntmode.ca, sign in and open **Connect** from the extension popup (or visit `/extension/connect?ext=<your-extension-id>`)

## Usage

- **Right-click** a page or link → *Save to HuntMode queue* or *Add to HuntMode now*
- **Toolbar popup** → Save this tab / Add to hunt now / view queue
- Open **huntmode.ca** → import banner offers to turn queued URLs into draft applications

## Permissions

- `huntmode.ca` only (v1)
- Queue stored locally in `chrome.storage.local`
- Auth token stored in `chrome.storage.session` after connecting on huntmode.ca
