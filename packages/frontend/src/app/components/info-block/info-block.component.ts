import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { IonIcon } from "@ionic/angular";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "info-block",
  templateUrl: "info-block.component.html",
  styleUrls: ["./info-block.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...SHARED_UI_IMPORTS, IonIcon],
})
export class InfoBlockComponent {
  @Input() icon = "";
  @Input() ariaLabel: string | null = null;
  @Input() color: "" | "danger" = "";
}
