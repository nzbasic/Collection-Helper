import { Injectable } from '@angular/core';
import axios from 'axios';
import { fullIp } from '../app.component';

@Injectable({
  providedIn: 'root'
})
export class UtilService {
  openUrl(url: string) {
    axios.post(fullIp + "/openUrl", { url: url })
  }
}
