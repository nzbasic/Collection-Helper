import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { IpcService } from '../../services/ipc.service';

@Component({
  selector: 'app-update',
  templateUrl: './update.component.html'
})
export class UpdateComponent implements OnInit {

  public downloaded = false
  @Output() emitter = new EventEmitter<boolean>()

  constructor(private ipcService: IpcService) { }

  ngOnInit(): void {
    this.ipcService.on('update_downloaded', () => {
      this.downloaded = true
    });
  }

  yes(): void {
    this.ipcService.send('restart_app')
  }

  no(): void {
    this.emitter.emit(false)
  }

}
