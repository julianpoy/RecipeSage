import {
  Component,
  ContentChild,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
} from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { IonModal } from "@ionic/angular/standalone";

@Component({
  standalone: true,
  selector: "alert-modal",
  templateUrl: "alert-modal.component.html",
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
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<void>();

  @ContentChild(TemplateRef) bodyTemplate?: TemplateRef<unknown>;

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
