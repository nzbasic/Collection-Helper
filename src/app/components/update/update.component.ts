import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IpcService } from '../../services/ipc.service';

@Component({
  selector: 'app-update',
  templateUrl: './update.component.html'
})
export class UpdateComponent implements OnInit {

  @Input() downloaded!: boolean
  @Output() emitter = new EventEmitter<boolean>()

  constructor(private ipcService: IpcService) { }

  ngOnInit(): void {

  }

  yes(): void {
    this.ipcService.send('restart_app')
  }

  no(): void {
    this.emitter.emit(false)
  }

}
