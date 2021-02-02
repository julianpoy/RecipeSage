import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastController, AlertController, NavController, ModalController } from '@ionic/angular';

import { UserService } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { RecipeService } from '@/services/recipe.service';
import { ImageViewerComponent } from '@/modals/image-viewer/image-viewer.component';
import { NewMessageModalPage } from '@/pages/messaging-components/new-message-modal/new-message-modal.page';
import { ShareProfileModalPage } from '../share-profile-modal/share-profile-modal.page';
import { AuthModalPage } from '@/pages/auth-modal/auth-modal.page';

@Component({
  selector: 'page-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss']
})
export class ProfilePage {
  defaultBackHref: string = RouteMap.SocialPage.getPath();

  handle: string;
  profile;

  myProfile;

  constructor(
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public recipeService: RecipeService,
    public userService: UserService) {

    this.handle = this.route.snapshot.paramMap.get('handle').substring(1);
  }

  async profileDisabledError() {
    const alert = await this.alertCtrl.create({
      header: 'Profile is not enabled',
      message: 'This user has disabled their profile and is therefore private/inaccessible.',
      buttons: [
        {
          text: 'Okay',
          handler: () => {
            this.navCtrl.navigateRoot(RouteMap.PeoplePage.getPath());
          }
        }
      ]
    });
    alert.present();
  }

  ionViewWillEnter() {
    this.load();
  }

  async load() {
    const loading = this.loadingService.start();
    this.profile = await this.userService.getProfileByHandle(this.handle, {
      403: () => this.profileDisabledError()
    });

    this.myProfile = await this.userService.getMyProfile({
      401: () => {},
    });

    loading.dismiss();
  }

  async openImageViewer() {
    const imageViewerModal = await this.modalCtrl.create({
      component: ImageViewerComponent,
      componentProps: {
        imageUrls: this.profile.profileImages.map(image => image.location)
      }
    });
    imageViewerModal.present();
  }

  open(item) {
    if(item.type === 'all-recipes') {
      this.navCtrl.navigateForward(RouteMap.HomePage.getPath('main', { userId: item.userId }));
    } else if(item.type === 'label') {
      this.navCtrl.navigateForward(RouteMap.HomePage.getPath('main', { userId: item.userId, selectedLabels: [item.label.title] }));
    } else if (item.type === 'recipe') {
      this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(item.recipe.id));
    }
  }

  async addFriend() {
    const loading = this.loadingService.start();

    await this.userService.addFriend(this.profile.id);
    loading.dismiss();

    const tst = await this.toastCtrl.create({
      message: 'Friend invite sent!',
      duration: 5000,
      buttons: [{
        side: 'end',
        role: 'cancel',
        text: 'Dismiss',
      }]
    });
    tst.present();

    this.load();
  }

  async deleteFriend() {
    const loading = this.loadingService.start();

    await this.userService.deleteFriend(this.profile.id);
    loading.dismiss();

    const tst = await this.toastCtrl.create({
      message: 'Friendship removed',
      duration: 5000,
      buttons: [{
        side: 'end',
        role: 'cancel',
        text: 'Dismiss',
      }]
    });
    tst.present();

    this.load();
  }

  async shareProfile() {
    const modal = await this.modalCtrl.create({
      component: ShareProfileModalPage,
      componentProps: {
        profile: this.profile
      }
    });
    modal.present();
  }

  async sendMessage() {
    const modal = await this.modalCtrl.create({
      component: NewMessageModalPage,
      componentProps: {
        initialRecipientId: this.profile.id
      }
    });
    modal.present();
  }

  isLoggedIn() {
    return this.utilService.isLoggedIn();
  }

  setupMyProfile() {
    this.navCtrl.navigateForward(RouteMap.MyProfilePage.getPath());
  }

  async setupMyProfileAlert() {
    const alert = await this.alertCtrl.create({
      header: 'Your profile isn\'t setup yet',
      message: 'To add this user as a friend, you need to setup your profile.',
      buttons: [{
        text: 'Cancel',
      }, {
        text: 'Setup',
        handler: () => {
          this.setupMyProfile();
        }
      }]
    });
    await alert.present();
    await alert.onDidDismiss();
  }

  async refresh(refresher) {
    refresher.target.complete();
    this.load();
  }

  async auth() {
    const authModal = await this.modalCtrl.create({
      component: AuthModalPage,
      componentProps: {
        register: true
      }
    });
    await authModal.present();
    await authModal.onDidDismiss();
  }

  async authAndAddFriend() {
    await this.auth();
    await this.load();

    if (this.profile?.incomingFriendship || this.profile?.outgoingFriendship) {
      const tst = await this.toastCtrl.create({
        message: 'It looks like you already have a friendship in progress. Please try again.',
        duration: 3000,
      });
      await tst.present();
      return;
    }

    if (!this.myProfile?.enableProfile) {
      this.setupMyProfileAlert();
      return;
    }

    await this.addFriend();
  }
}
