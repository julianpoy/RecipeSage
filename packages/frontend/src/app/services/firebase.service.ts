import { Injectable } from "@angular/core";
import { initializeApp } from "firebase/app";

@Injectable({
  providedIn: "root",
})
export class FirebaseService {
  private readonly config = {
    appId: "1:1064631313987:android:b6ca7a14265a6a01",
    apiKey: "AIzaSyANy7PbiPae7dmi4yYockrlvQz3tEEIkL0",
    projectId: "chef-book",
    messagingSenderId: "1064631313987",
  };

  public readonly app = initializeApp(this.config);

  constructor() {}
}
