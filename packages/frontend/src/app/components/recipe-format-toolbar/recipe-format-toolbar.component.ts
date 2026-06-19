import { Component, Input, inject } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { IonButton, IonIcon } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { TextAreaComponent } from "../forms/text-area/text-area.component";

export type RecipeFormatField = "ingredients" | "instructions" | "notes";

type RecipeFormatAction =
  | "bold"
  | "italic"
  | "underline"
  | "header"
  | "scale"
  | "continuation"
  | "image"
  | "table";

interface RecipeFormatButton {
  action: RecipeFormatAction;
  icon: string;
  labelKey: string;
}

// Remix Icon (24x24) path data
const remixIcon = (path: string) =>
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='currentColor' d='${path}'/></svg>`;

const FORMAT_ICONS = {
  "rs-format-bold": remixIcon(
    "M8 11H12.5C13.8807 11 15 9.88071 15 8.5C15 7.11929 13.8807 6 12.5 6H8V11ZM18 15.5C18 17.9853 15.9853 20 13.5 20H6V4H12.5C14.9853 4 17 6.01472 17 8.5C17 9.70431 16.5269 10.7981 15.7564 11.6058C17.0979 12.3847 18 13.837 18 15.5ZM8 13V18H13.5C14.8807 18 16 16.8807 16 15.5C16 14.1193 14.8807 13 13.5 13H8Z",
  ),
  "rs-format-italic": remixIcon(
    "M15 20H7V18H9.92661L12.0425 6H9V4H17V6H14.0734L11.9575 18H15V20Z",
  ),
  "rs-format-underline": remixIcon(
    "M8 3V12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12V3H18V12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12V3H8ZM4 20H20V22H4V20Z",
  ),
  "rs-format-header": remixIcon("M17 11V4H19V21H17V13H7V21H5V4H7V11H17Z"),
  "rs-format-scale": remixIcon(
    "M5.99805 2C5.99805 2.51284 6.48805 3 6.99805 3H16.998C17.5109 3 17.998 2.51 17.998 2H19.998C19.998 3.65685 18.6549 5 16.998 5H12.998L12.999 7.06201C16.9449 7.55453 19.998 10.9207 19.998 15V21C19.998 21.5523 19.5503 22 18.998 22H4.99805C4.44576 22 3.99805 21.5523 3.99805 21V15C3.99805 10.9204 7.05176 7.55396 10.9981 7.06189L10.998 5H6.99805C5.33805 5 3.99805 3.66 3.99805 2H5.99805ZM11.998 9C8.75965 9 5.99805 11.76 5.99805 15V20H17.998V15C17.998 11.7616 15.2364 9 11.998 9ZM11.998 11C12.7399 11 13.4345 11.2019 14.03 11.5538L11.2909 14.2929C10.9004 14.6834 10.9004 15.3166 11.2909 15.7071C11.6514 16.0676 12.2187 16.0953 12.6109 15.7903L12.7052 15.7071L15.4442 12.968C15.7961 13.5635 15.998 14.2582 15.998 15C15.998 17.2091 14.2072 19 11.998 19C9.78891 19 7.99805 17.2091 7.99805 15C7.99805 12.7909 9.78891 11 11.998 11Z",
  ),
  "rs-format-continuation": remixIcon(
    "M15 18H16.5C17.8807 18 19 16.8807 19 15.5C19 14.1193 17.8807 13 16.5 13H3V11H16.5C18.9853 11 21 13.0147 21 15.5C21 17.9853 18.9853 20 16.5 20H15V22L11 19L15 16V18ZM3 4H21V6H3V4ZM9 18V20H3V18H9Z",
  ),
  "rs-format-image": remixIcon(
    "M2.9918 21C2.44405 21 2 20.5551 2 20.0066V3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918ZM20 15V5H4V19L14 9L20 15ZM20 17.8284L14 11.8284L6.82843 19H20V17.8284ZM8 11C6.89543 11 6 10.1046 6 9C6 7.89543 6.89543 7 8 7C9.10457 7 10 7.89543 10 9C10 10.1046 9.10457 11 8 11Z",
  ),
  "rs-format-table": remixIcon(
    "M4 8H20V5H4V8ZM14 19V10H10V19H14ZM16 19H20V10H16V19ZM8 19V10H4V19H8ZM3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3Z",
  ),
  "rs-format-help": remixIcon(
    "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 7H13V9H11V7ZM11 11H13V17H11V11Z",
  ),
};

const DOCS_BASE =
  "https://docs.recipesage.com/docs/tutorials/recipes/edit-recipe";

const FIELD_DOCS_ANCHOR: Record<RecipeFormatField, string> = {
  ingredients: "#ingredients",
  instructions: "#instructions",
  notes: "#notes",
};

const BUTTONS: Record<RecipeFormatAction, RecipeFormatButton> = {
  bold: {
    action: "bold",
    icon: "rs-format-bold",
    labelKey: "components.recipeFormatToolbar.bold",
  },
  italic: {
    action: "italic",
    icon: "rs-format-italic",
    labelKey: "components.recipeFormatToolbar.italic",
  },
  underline: {
    action: "underline",
    icon: "rs-format-underline",
    labelKey: "components.recipeFormatToolbar.underline",
  },
  header: {
    action: "header",
    icon: "rs-format-header",
    labelKey: "components.recipeFormatToolbar.header",
  },
  scale: {
    action: "scale",
    icon: "rs-format-scale",
    labelKey: "components.recipeFormatToolbar.scale",
  },
  continuation: {
    action: "continuation",
    icon: "rs-format-continuation",
    labelKey: "components.recipeFormatToolbar.continuation",
  },
  image: {
    action: "image",
    icon: "rs-format-image",
    labelKey: "components.recipeFormatToolbar.image",
  },
  table: {
    action: "table",
    icon: "rs-format-table",
    labelKey: "components.recipeFormatToolbar.table",
  },
};

const FIELD_ACTIONS: Record<RecipeFormatField, RecipeFormatAction[]> = {
  ingredients: ["bold", "italic", "underline", "header"],
  instructions: [
    "bold",
    "italic",
    "underline",
    "header",
    "scale",
    "continuation",
    "image",
  ],
  notes: ["bold", "italic", "underline", "header", "scale", "image", "table"],
};

@Component({
  standalone: true,
  selector: "recipe-format-toolbar",
  templateUrl: "./recipe-format-toolbar.component.html",
  styleUrls: ["./recipe-format-toolbar.component.scss"],
  imports: [...SHARED_UI_IMPORTS, IonButton, IonIcon],
})
export class RecipeFormatToolbarComponent {
  private translate = inject(TranslateService);

  @Input({ required: true }) field!: RecipeFormatField;
  @Input({ required: true }) target!: TextAreaComponent;
  @Input() imageCount = 0;

  constructor() {
    addIcons(FORMAT_ICONS);
  }

  get buttons(): RecipeFormatButton[] {
    return FIELD_ACTIONS[this.field].map((action) => BUTTONS[action]);
  }

  get docsHref(): string {
    return `${DOCS_BASE}${FIELD_DOCS_ANCHOR[this.field]}`;
  }

  isDisabled(action: RecipeFormatAction): boolean {
    return action === "image" && this.imageCount === 0;
  }

  runAction(action: RecipeFormatAction) {
    const el = this.target.getControlElement();
    if (!el) return;
    el.focus();

    switch (action) {
      case "bold":
        this.wrapSelection(el, "**", "**", "placeholder.bold");
        break;
      case "italic":
        this.wrapSelection(el, "*", "*", "placeholder.italic");
        break;
      case "underline":
        this.wrapSelection(el, "__", "__", "placeholder.underline");
        break;
      case "scale":
        this.wrapSelection(el, "{", "}", "placeholder.scale");
        break;
      case "header":
        this.wrapLine(el, "[", "]", "placeholder.header");
        break;
      case "continuation":
        this.insertContinuation(el);
        break;
      case "image":
        this.insertImage(el);
        break;
      case "table":
        this.insertTable(el);
        break;
    }
  }

  private translatePlaceholder(suffix: string): string {
    return this.translate.instant(`components.recipeFormatToolbar.${suffix}`);
  }

  private insertText(el: HTMLTextAreaElement, text: string) {
    document.execCommand("insertText", false, text);
  }

  private wrapSelection(
    el: HTMLTextAreaElement,
    prefix: string,
    suffix: string,
    placeholderSuffix: string,
  ) {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end);

    if (selected) {
      this.insertText(el, `${prefix}${selected}${suffix}`);
      el.selectionStart = start + prefix.length;
      el.selectionEnd = start + prefix.length + selected.length;
    } else {
      const placeholder = this.translatePlaceholder(placeholderSuffix);
      this.insertText(el, `${prefix}${placeholder}${suffix}`);
      el.selectionStart = start + prefix.length;
      el.selectionEnd = start + prefix.length + placeholder.length;
    }
  }

  private wrapLine(
    el: HTMLTextAreaElement,
    prefix: string,
    suffix: string,
    placeholderSuffix: string,
  ) {
    const value = el.value;
    const lineStart = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const nextNewline = value.indexOf("\n", el.selectionEnd);
    const lineEnd = nextNewline === -1 ? value.length : nextNewline;
    const lineText = value.slice(lineStart, lineEnd);

    el.selectionStart = lineStart;
    el.selectionEnd = lineEnd;

    if (lineText) {
      this.insertText(el, `${prefix}${lineText}${suffix}`);
      el.selectionStart = lineStart + prefix.length;
      el.selectionEnd = lineStart + prefix.length + lineText.length;
    } else {
      const placeholder = this.translatePlaceholder(placeholderSuffix);
      this.insertText(el, `${prefix}${placeholder}${suffix}`);
      el.selectionStart = lineStart + prefix.length;
      el.selectionEnd = lineStart + prefix.length + placeholder.length;
    }
  }

  private insertContinuation(el: HTMLTextAreaElement) {
    this.insertText(el, "\\\n");
  }

  private insertImage(el: HTMLTextAreaElement) {
    const start = el.selectionStart;
    const text = "![image:1]";
    const numberIndex = text.indexOf("1");
    this.insertText(el, text);
    el.selectionStart = start + numberIndex;
    el.selectionEnd = start + numberIndex + 1;
  }

  private insertTable(el: HTMLTextAreaElement) {
    const header1 = this.translatePlaceholder("table.header");
    const cell = this.translatePlaceholder("table.cell");
    const value = el.value;
    const atLineStart =
      el.selectionStart === 0 || value[el.selectionStart - 1] === "\n";
    const leading = atLineStart ? "" : "\n";

    const table = [
      `| ${header1} 1 | ${header1} 2 |`,
      `| --- | --- |`,
      `| ${cell} | ${cell} |`,
    ].join("\n");

    this.insertText(el, `${leading}${table}\n`);
  }
}
