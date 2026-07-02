import { css, html, LitElement, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  defaultsFromSchema,
  serializeSettings,
  type ProviderSettings,
  type SettingField,
  type SettingsSchema,
  type SettingValue,
} from '@web-file-reader/core';
import { WFR_SETTINGS_CHANGE } from './settings-events';

const inputText = (event: Event): string =>
  event.currentTarget instanceof HTMLInputElement ||
  event.currentTarget instanceof HTMLSelectElement
    ? event.currentTarget.value
    : '';

const inputChecked = (event: Event): boolean =>
  event.currentTarget instanceof HTMLInputElement ? event.currentTarget.checked : false;

/**
 * Headless settings panel rendered purely from a provider's {@link SettingsSchema}.
 * Each change emits a bubbling, composed `wfr-settings-change` event carrying the
 * complete settings object and its serialized form, ready for host persistence.
 */
@customElement('wfr-settings-panel')
export class WfrSettingsPanel extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    [part='form'] {
      display: flex;
      flex-direction: column;
      gap: var(--wfr-settings-gap, 0.75rem);
    }
    [part='field'] {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--wfr-settings-field-gap, 1rem);
    }
    input:focus-visible,
    select:focus-visible {
      outline: var(--wfr-focus-outline, 2px solid currentColor);
      outline-offset: 2px;
    }
  `;

  /** The provider's settings schema describing each control. */
  @property({ attribute: false }) schema: SettingsSchema = [];
  /** Current setting values (merged over schema defaults). */
  @property({ attribute: false }) settings: ProviderSettings = {};

  override render(): TemplateResult {
    const values = this.#values();
    return html`
      <slot name="header"></slot>
      <div part="form" role="group" aria-label="Viewer settings">
        ${this.schema.map((field) => this.#renderField(field, values[field.key]))}
      </div>
      <slot name="footer"></slot>
    `;
  }

  #values(): ProviderSettings {
    return { ...defaultsFromSchema(this.schema), ...this.settings };
  }

  #renderField(field: SettingField, value: SettingValue | undefined): TemplateResult {
    const id = `wfr-setting-${field.key}`;
    return html`
      <label part="field" for=${id}>
        <span part="label">${field.label}</span>
        ${this.#renderControl(field, value, id)}
      </label>
    `;
  }

  #renderControl(
    field: SettingField,
    value: SettingValue | undefined,
    id: string,
  ): TemplateResult {
    switch (field.kind) {
      case 'boolean':
        return html`<input
          part="control"
          id=${id}
          type="checkbox"
          .checked=${value === true}
          @change=${(event: Event) => this.#commit(field.key, inputChecked(event))}
        />`;
      case 'number':
        return html`<input
          part="control"
          id=${id}
          type="number"
          .value=${String(value ?? field.default)}
          min=${field.min ?? ''}
          max=${field.max ?? ''}
          step=${field.step ?? ''}
          @change=${(event: Event) => this.#commit(field.key, Number(inputText(event)))}
        />`;
      case 'text':
        return html`<input
          part="control"
          id=${id}
          type="text"
          .value=${String(value ?? field.default)}
          @change=${(event: Event) => this.#commit(field.key, inputText(event))}
        />`;
      case 'select':
        return html`<select
          part="control"
          id=${id}
          @change=${(event: Event) => this.#commit(field.key, inputText(event))}
        >
          ${field.options.map(
            (option) => html`<option value=${option.value} ?selected=${option.value === value}>
              ${option.label}
            </option>`,
          )}
        </select>`;
    }
  }

  #commit(key: string, value: SettingValue): void {
    const next: ProviderSettings = { ...this.#values(), [key]: value };
    this.settings = next;
    this.dispatchEvent(
      new CustomEvent(WFR_SETTINGS_CHANGE, {
        detail: { settings: next, serialized: serializeSettings(next) },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wfr-settings-panel': WfrSettingsPanel;
  }
}
