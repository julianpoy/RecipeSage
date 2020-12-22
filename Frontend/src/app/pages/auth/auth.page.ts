import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';

import { IS_SELFHOST } from 'src/environments/environment';

import { EventService } from '@/services/event.service';
import { UserService } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { MessagingService } from '@/services/messaging.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { CapabilitiesService } from '@/services/capabilities.service';

@Component({
  selector: 'page-auth',
  templateUrl: 'auth.page.html',
  styleUrls: ['auth.page.scss'],
  providers: [ UserService ]
})
export class AuthPage {
  isSelfHost = IS_SELFHOST;

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  showLogin = true;

  redirect: string;

  constructor(
    public events: EventService,
    public navCtrl: NavController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public messagingService: MessagingService,
    public capabilitiesService: CapabilitiesService,
    public toastCtrl: ToastController,
    public route: ActivatedRoute,
    public userService: UserService) {

    if (this.route.snapshot.paramMap.get('authType') === AuthType.Register) {
      this.showLogin = false;
    }

    if (this.route.snapshot.paramMap.get('redirect')) {
      this.redirect = this.route.snapshot.queryParamMap.get('redirect');
    }
  }

  toggleLogin() {
    this.showLogin = !this.showLogin;
  }

  async presentToast(msg) {
    (await this.toastCtrl.create({
      message: msg,
      duration: 6000
    })).present();
  }

  auth() {
    if (!this.showLogin) this.name = (document.getElementById('name') as HTMLInputElement).value;
    this.email = (document.getElementById('email') as HTMLInputElement).value;
    this.password = (document.getElementById('password') as HTMLInputElement).value;
    if (!this.showLogin) this.confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.showLogin && !emailRegex.test(this.email)) {
      this.presentToast('Please enter a valid email address.');
      return;
    }
    if (!this.showLogin && this.name.length < 1) {
      this.presentToast('Please enter a name (you can enter a nickname!)');
      return;
    }
    if (this.password.length === 0) {
      this.presentToast('Please enter a password.');
      return;
    }
    if (!this.showLogin && this.password.length < 6) {
      this.presentToast('Please enter a password at least 6 characters long.');
      return;
    }
    if (this.email.length === 0) {
      this.presentToast('Please enter your email address.');
      return;
    }

    const loading = this.loadingService.start();

    if (this.showLogin) {
      this.userService.login({
        email: this.email,
        password: this.password
      }).then(response => {
        loading.dismiss();

        localStorage.setItem('token', response.token);
        this.capabilitiesService.updateCapabilities();

        if ('Notification' in window && (Notification as any).permission === 'granted') {
          this.messagingService.requestNotifications();
        }

        this.events.publish('auth:login');
        this.handleRedirect();
      }).catch(err => {
        loading.dismiss();
        switch (err.response.status) {
          case 0:
            this.presentToast('It looks like you\'re offline right now.');
            break;
          case 412:
            this.presentToast('It looks like that email or password isn\'t correct.');
            break;
          default:
            this.presentToast(this.utilService.standardMessages.unexpectedError);
            break;
        }
      });
    } else {
      if (this.password === this.confirmPassword) {
        this.userService.register({
          name: this.name,
          email: this.email,
          password: this.password
        }).then(response => {
          loading.dismiss();

          localStorage.setItem('token', response.token);
          this.capabilitiesService.updateCapabilities();

          if ('Notification' in window && (Notification as any).permission === 'granted') {
            this.messagingService.requestNotifications();
          }

          this.events.publish('auth:register');
          this.handleRedirect();
        }).catch(err => {
          loading.dismiss();
          switch (err.response.status) {
            case 0:
              this.presentToast('It looks like you\'re offline right now.');
              break;
            case 412:
              this.presentToast('Please enter an email address.');
              break;
            case 406:
              this.presentToast('An account with that email address already exists.');
              break;
            default:
              this.presentToast(this.utilService.standardMessages.unexpectedError);
              break;
          }
        });
      } else {
        loading.dismiss();
        this.presentToast('The password and confirmation you entered do not match.');
      }
    }
  }

  forgotPassword() {
    this.email = (document.getElementById('email') as HTMLInputElement).value;
    if (!this.email) {
      this.presentToast('Please enter your account email and try again');
      return;
    }

    const loading = this.loadingService.start();

    this.userService.forgot({
      email: this.email
    }).then(async response => {
      loading.dismiss();

      const successToast = await this.toastCtrl.create({
        message: `If there is a RecipeSage account associated with that email address,
                  you should receive a password reset link within the next few minutes.`,
        duration: 7000
      });
      successToast.present();
    }).catch(err => {
      loading.dismiss();
      switch (err.response.status) {
        case 0:
          this.presentToast('It looks like you\'re offline right now.');
          break;
        default:
          this.presentToast(this.utilService.standardMessages.unexpectedError);
          break;
      }
    });
  }

  showLegal(e) {
    e.preventDefault();
    this.navCtrl.navigateForward(RouteMap.LegalPage.getPath());
  }

  handleRedirect() {
    this.navCtrl.navigateRoot(this.redirect || RouteMap.HomePage.getPath('main'));
  }
}
