import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, LoadingController } from 'ionic-angular';

import { UserServiceProvider } from '../../providers/user-service/user-service';

@IonicPage({
  priority: 'high'
})
@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
  providers: [ UserServiceProvider ]
})
export class LoginPage {
  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';

  showLogin: boolean = true;
  
  errorMessage: string = '';

  constructor(
    public navCtrl: NavController,
    public loadingCtrl: LoadingController,
    public navParams: NavParams,
    public userService: UserServiceProvider) {

  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad LoginPage');
    
    this.errorMessage = '';
    
    localStorage.removeItem('token');
  }

  toggleLogin() {
    this.showLogin = !this.showLogin;
    
    this.errorMessage = '';
  }

  auth() {
    var emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|edu|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum)\b/;
    if (!this.showLogin && !emailRegex.test(this.email)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    } else if (!this.showLogin && this.name.length < 1) {
      this.errorMessage = 'Please enter a name (you can enter a nickname!)';
      return;
    } else if (this.password.length === 0) { 
      this.errorMessage = 'Please enter a password.';
      return;
    } else if (!this.showLogin && this.password.length < 6) {
      this.errorMessage = 'Please enter a password at least 6 characters long.';
      return;
    } else if (this.email.length === 0) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }
    
    var me = this;
    this.errorMessage = '';
    
    let loading = this.loadingCtrl.create({
      content: 'Authenticating...',
      dismissOnPageChange: true
    });
  
    loading.present();
    
    if (this.showLogin) {
      this.userService.login({
        email: this.email,
        password: this.password
      }).subscribe(function(response) {
        loading.dismiss();
        
        localStorage.setItem('token', response.token);
        
        me.navCtrl.setRoot('HomePage', { folder: 'main' }, {animate: true, direction: 'forward'});
      }, function(err) {
        loading.dismiss();
        switch(err.status) {
          case 404:
            me.errorMessage = 'I can\'t find an account with that email address.';
            break;
          case 401:
            me.errorMessage = 'That password doesn\'t match the email address you entered.';
            break;
          default:
            me.errorMessage = 'An unexpected error occured. Please try again.';
            break;
        }
      });
    } else {
      if (this.password === this.confirmPassword) {
        this.userService.register({
          name: this.name,
          email: this.email,
          password: this.password
        }).subscribe(function(response) {
          loading.dismiss();
          
          localStorage.setItem('token', response.token);
          
          me.navCtrl.setRoot('HomePage', { folder: 'main' }, {animate: true, direction: 'forward'});
        }, function(err) {
          loading.dismiss();
          switch(err.status) {
            case 412:
              me.errorMessage = 'Please enter an email address.';
              break;
            case 406:
              me.errorMessage = 'An account with that email address already exists.';
              break;
            default:
              me.errorMessage = 'An unexpected error occured. Please try again.';
              break;
          }
        });
      } else {
        loading.dismiss();
        me.errorMessage = 'The password and confirmation you entered do not match.';
      }
    }
  }

}
