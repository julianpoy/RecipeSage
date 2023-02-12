import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { AlertButton, AlertController, AlertInput, IonTextarea, ModalController, ToastController } from '@ionic/angular';
import {TranslateService} from '@ngx-translate/core';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import HardBreak from '@tiptap/extension-hard-break'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Link from '@tiptap/extension-link'
import TurndownService from 'turndown';

import { UserService } from '@/services/user.service';
import { Image, ImageService } from '@/services/image.service';
import { LoadingService } from '@/services/loading.service';
import { CapabilitiesService } from '@/services/capabilities.service';
import { UtilService, RouteMap } from '@/services/util.service';
import {SelectRecipeComponent} from '../select-recipe/select-recipe.component';
import {SelectRecipeModalComponent} from '@/modals/select-recipe/select-recipe-modal.component';
import {Recipe} from '@/services/recipe.service';
import {marked} from 'marked';
import History from '@tiptap/extension-history';
import TiptapImage from '@tiptap/extension-image';

@Component({
  selector: 'recipe-wysiwyg',
  templateUrl: 'recipe-wysiwyg.component.html',
  styleUrls: ['./recipe-wysiwyg.component.scss']
})
export class RecipeWysiwygComponent {
  @ViewChild('textarea') textarea: IonTextarea;
  @ViewChild('editor') editorEl: HTMLDivElement;

  editor = new Editor({
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      Link.configure({
        openOnClick: false,
      }),
      Bold,
      Italic,
      OrderedList,
      ListItem,
      History,
      TiptapImage.configure({
        inline: true,
      })
    ],
  });
  tiptapHtml: string = "";

  @Output() contentChange = new EventEmitter();
  @Input()
  set content(value: string) {
    if (this.tiptapHtml) return;
    this.tiptapHtml = value;
  }

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

  editorChange() {
    console.log(this.editor.view.dom.innerText);
    this.contentChange.emit({
      html: this.tiptapHtml,
      text: this.editor.view.dom.innerText,
    });
  }

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

  actionItalic(event: MouseEvent) {
    event.preventDefault();

    this.editor.commands.toggleItalic();
  }

  actionBold(event: MouseEvent) {
    event.preventDefault();

    this.editor.chain().focus().toggleBold().run();
  }

  async _actionLink(href: string, title?: string) {
    this.editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({
        href,
        target: '_blank'
      })
      .command(({ tr }) => {
         if (title) tr.insertText(title);
         return true;
      })
      .run()
  }

  async actionLink(event: MouseEvent) {
    event.preventDefault();

    const header = await this.translate.get('components.recipeWysiwyg.link.header').toPromise();
    const textPlaceholder = await this.translate.get('components.recipeWysiwyg.link.text').toPromise();
    const linkPlaceholder = await this.translate.get('components.recipeWysiwyg.link.link').toPromise();
    const okay = await this.translate.get('generic.okay').toPromise();
    const cancel = await this.translate.get('generic.cancel').toPromise();
    const del = await this.translate.get('generic.delete').toPromise();

    const buttons: AlertButton[] = [
      {
        text: cancel,
        role: 'cancel',
      },
      {
        text: okay,
        handler: (data) => this._actionLink(data.link, data.title),
      }
    ];

    if (this.editor.isActive('link')) {
      buttons.unshift({
        text: del,
        handler: () => this.editor.commands.unsetLink(),
      });
    }

    const inputs: AlertInput[] = [
      {
        name: 'link',
        placeholder: linkPlaceholder,
        value: this.editor.getAttributes('link').href || ''
      },
    ];

    if (!this.editor.isActive('link') && this.editor.view.state.selection.empty) {
      inputs.unshift({
        name: 'title',
        placeholder: textPlaceholder,
      });
    }

    const alert = await this.alertCtrl.create({
      header,
      inputs,
      buttons
    });
    await alert.present();
  }

  async _actionRecipe(recipe: Recipe) {
    console.log("adding recipe", recipe);
  }

  async actionRecipe(event: MouseEvent) {
    event.preventDefault();

    const alert = await this.modalCtrl.create({
      component: SelectRecipeModalComponent,
    });
    await alert.present();

    const { data } = await alert.onDidDismiss();

    if (data?.recipe) this._actionRecipe(data.recipe);
  }

}
