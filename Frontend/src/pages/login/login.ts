import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, LoadingController } from 'ionic-angular';

import { HomePage } from '../home/home';

import { UserServiceProvider } from '../../providers/user-service/user-service';

@IonicPage()
@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
  providers: [ UserServiceProvider ]
})
export class LoginPage {

  email: string;
  password: string;
  confirmPassword: string;

  showLogin: boolean;
  
  errorMessage: string;

  constructor(
    public navCtrl: NavController,
    public loadingCtrl: LoadingController,
    public navParams: NavParams,
    public userService: UserServiceProvider) {
    this.showLogin = true;
    
    this.errorMessage = '';
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
    var me = this;
    this.errorMessage = '';
    
    let loading = this.loadingCtrl.create({
      content: 'Authenticating...'
    });
  
    loading.present();
    
    if (this.showLogin) {
      this.userService.login({
        email: this.email,
        password: this.password
      }).subscribe(function(response) {
        loading.dismiss();
        
        localStorage.setItem('token', response.token);
        
        me.navCtrl.setRoot(HomePage, {}, {animate: true, direction: 'forward'});
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
          email: this.email,
          password: this.password
        }).subscribe(function(response) {
          loading.dismiss();
          
          localStorage.setItem('token', response.token);
          
          me.navCtrl.setRoot(HomePage, {}, {animate: true, direction: 'forward'});
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
