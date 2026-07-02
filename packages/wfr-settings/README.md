# @web-file-reader/settings

Headless Lit settings panel for [web-file-reader].

`<wfr-settings-panel>` renders form controls purely from a provider's `SettingsSchema` (`boolean` → checkbox, `number` → number input, `text` → text input, `select` → dropdown). Each change emits a bubbling, composed `wfr-settings-change` event carrying the complete, schema-valid settings object plus its serialized string — ready for the host to persist.

## Usage

```ts
import '@web-file-reader/settings';

const panel = document.querySelector('wfr-settings-panel');
panel.schema = providerModule.settingsSchema;
panel.settings = currentSettings;
panel.addEventListener('wfr-settings-change', (e) => {
  localStorage.setItem('wfr:pdf', e.detail.serialized);
  viewer.settings = e.detail.settings;
});
```

## Customize

- **Slots**: `header`, `footer`.
- **Parts**: `form`, `field`, `label`, `control`.
- **Custom properties**: `--wfr-settings-gap`, `--wfr-settings-field-gap`, `--wfr-focus-outline`.

