import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { AlertController, IonTextarea, ModalController, ToastController } from '@ionic/angular';
import {TranslateService} from '@ngx-translate/core';

import { UserService } from '@/services/user.service';
import { Image, ImageService } from '@/services/image.service';
import { LoadingService } from '@/services/loading.service';
import { CapabilitiesService } from '@/services/capabilities.service';
import { UtilService, RouteMap } from '@/services/util.service';
import {SelectRecipeComponent} from '../select-recipe/select-recipe.component';
import {SelectRecipeModalComponent} from '@/modals/select-recipe/select-recipe-modal.component';
import {Recipe} from '@/services/recipe.service';

@Component({
  selector: 'recipe-wysiwyg',
  templateUrl: 'recipe-wysiwyg.component.html',
  styleUrls: ['./recipe-wysiwyg.component.scss']
})
export class RecipeWysiwygComponent {

  @ViewChild('textarea') textarea: IonTextarea;

  @Output() contentChange = new EventEmitter();
  @Input() content: string;

  constructor(
    private utilService: UtilService,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private userService: UserService,
    private imageService: ImageService,
    private loadingService: LoadingService,
    private translate: TranslateService,
    public capabilitiesService: CapabilitiesService,
  ) {}

  onInput(html: string) {
    console.log(html);
  }

  indexOfPreviousLinebreak(input: string, currentIdx: number) {
    const regex = /\n/g;

    let lastMatch = 0;
    while (regex.exec(input) !== null) {
      if (regex.lastIndex > currentIdx) return lastMatch;
      lastMatch = regex.lastIndex;
    }

    return lastMatch;
  }

  indexOfNextLinebreak(input: string, currentIdx: number) {
    const regex = /\n/g;
    regex.lastIndex = currentIdx;

    const idx = regex.exec(input)?.index;

    return idx || input.length;
  }

  async actionHeader(event) {
    event.preventDefault();

    const input = await this.textarea.getInputElement();

    const { selectionStart, selectionEnd, value } = input;

    const previousLinebreakIdx = this.indexOfPreviousLinebreak(value, selectionStart);
    const nextLinebreakIdx = this.indexOfNextLinebreak(value, selectionStart);

    const charAtStart = value.charAt(previousLinebreakIdx);
    const charAtEnd = value.charAt(nextLinebreakIdx - 1);

    let newCursorPos = selectionStart;
    let working = value;
    if (charAtStart === '[' && charAtEnd === ']') {
      working = working.slice(0, nextLinebreakIdx - 1) + working.slice(nextLinebreakIdx);
      working = working.slice(0, previousLinebreakIdx) + working.slice(previousLinebreakIdx + 1);
      newCursorPos = newCursorPos - 1;
    } else {
      if (charAtEnd !== ']') {
        working = working.slice(0, nextLinebreakIdx) + ']' + working.slice(nextLinebreakIdx);
      }
      if (charAtStart !== '[') {
        working = working.slice(0, previousLinebreakIdx) + '[' + working.slice(previousLinebreakIdx);
        newCursorPos = newCursorPos + 1;
      }
    }

    this.content = working;
    this.contentChange.emit(this.content);

    // Must occur after Angular/Ionic render cycle
    setTimeout(() => {
      input.selectionStart = newCursorPos;
      input.selectionEnd = newCursorPos;
    });
  }

  async _actionLink(input: HTMLTextAreaElement, title: string, link: string) {
    const { selectionStart, selectionEnd, value } = input;

    const mdLink = `[${title}](${link})`;

    this.content = value.substring(0, selectionStart) + mdLink + value.substring(selectionEnd);
  }

  async actionLink(event) {
    event.preventDefault();

    const input = await this.textarea.getInputElement();
    const { selectionStart, selectionEnd, value } = input;
    const selectedText = value.substring(selectionStart, selectionEnd);

    const header = await this.translate.get('components.recipeWysiwyg.link.header').toPromise();
    const textPlaceholder = await this.translate.get('components.recipeWysiwyg.link.text').toPromise();
    const linkPlaceholder = await this.translate.get('components.recipeWysiwyg.link.link').toPromise();
    const okay = await this.translate.get('generic.okay').toPromise();
    const cancel = await this.translate.get('generic.cancel').toPromise();

    const alert = await this.alertCtrl.create({
      header,
      inputs: [
        {
          name: 'title',
          placeholder: textPlaceholder,
          value: selectedText,
        },
        {
          name: 'link',
          placeholder: linkPlaceholder,
        },
      ],
      buttons: [
        {
          text: cancel,
          role: 'cancel',
        },
        {
          text: okay,
          handler: (data) => this._actionLink(input, data.title, data.link),
        }
      ]
    });
    await alert.present();
  }

  async _actionRecipe(input: HTMLTextAreaElement, recipe: Recipe) {
    const { selectionStart, selectionEnd, value } = input;

    const mdLink = `[${recipe.title}](#recipe:${recipe.id})`;

    this.content = value.substring(0, selectionStart) + mdLink + value.substring(selectionEnd);
  }

  async actionRecipe(event) {
    event.preventDefault();

    const input = await this.textarea.getInputElement();

    const alert = await this.modalCtrl.create({
      component: SelectRecipeModalComponent,
    });
    await alert.present();

    const { data } = await alert.onDidDismiss();

    if (data?.recipe) this._actionRecipe(input, data.recipe);
  }

}
