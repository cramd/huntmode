# HuntMode Chrome Extension

Save job postings to [huntmode.ca](https://www.huntmode.ca) from any page.

## Install

**[Add to Chrome — Chrome Web Store](https://chromewebstore.google.com/detail/kejpagponmjfjcjljojamacifnbmjmbk)**

### Development (load unpacked)

1. Open Chrome → **Extensions** → **Manage Extensions** → enable **Developer mode**
2. Click **Load unpacked** and select this `extension/` folder
3. On huntmode.ca, sign in and open **Connect** from the extension popup

## Usage

- **Right-click** a page or link → *Save to HuntMode queue* or *Add to HuntMode now*
- **Toolbar popup** → Save this tab / Add to hunt now / view queue
- Open **huntmode.ca** → import banner offers to turn queued URLs into draft applications

## Permissions

- HuntMode domains only (huntmode.ca / fuzzynacho.org)
- Queue stored locally in `chrome.storage.local`
- Auth token stored in `chrome.storage.session` after connecting on huntmode.ca

See [Privacy Policy](https://www.huntmode.ca/privacy) for data handling details.
