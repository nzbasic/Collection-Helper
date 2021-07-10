import { Injectable } from '@angular/core';
import { IpcRenderer } from 'electron';

@Injectable({
  providedIn: 'root'
})
export class IpcService {

  private ipc: IpcRenderer | undefined = void 0;

  constructor() {
    if ((window as any).require) {
      try {
        this.ipc = (window as any).require('electron').ipcRenderer;
      } catch (e) {
        throw e;
      }
    } else {
      console.warn('Electron IPC was not loaded');
    }
  }

  public on(channel: string, listener: any): boolean {
    if (!this.ipc) {
      return false
    }

    this.ipc.on(channel, listener);
    return true
  }

  public send(channel: string, ...args: any[]): boolean {
    if (!this.ipc) {
      return false
    }

    this.ipc.send(channel, ...args);
    return true
  }

  public invoke(channel: string, ...args: any[]): Promise<any> {
    if (!this.ipc) {
      return new Promise<boolean>((res) => res(false))
    }
    return this.ipc.invoke(channel, ...args)
  }
}
