import {
  Component,
  ContentChild,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
} from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { IonModal } from "@ionic/angular";

@Component({
  standalone: true,
  selector: "alert-modal",
  templateUrl: "alert-modal.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...SHARED_UI_IMPORTS, IonModal],
})
export class AlertModalComponent {
  @Input({
    required: true,
  })
  isOpen = false;
  @Input({
    required: true,
  })
  header!: string;
  @Input() message?: string;
  @Input() cancelLabel?: string;
  @Input() confirmLabel?: string;
  @Input() focusInputOnOpen = false;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<void>();

  @ContentChild(TemplateRef) bodyTemplate?: TemplateRef<unknown>;
  @ViewChild(IonModal, { read: ElementRef })
  modalElement!: ElementRef<HTMLElement>;

  onDidPresent() {
    if (!this.focusInputOnOpen) return;

    this.modalElement.nativeElement.querySelector("input")?.focus();
  }

  onCancel() {
    this.setOpen(false);
  }

  onDidDismiss() {
    this.setOpen(false);
  }

  private setOpen(isOpen: boolean) {
    if (this.isOpen === isOpen) return;

    this.isOpen = isOpen;
    this.isOpenChange.emit(isOpen);
  }
}
