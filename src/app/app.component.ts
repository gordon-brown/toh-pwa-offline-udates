import { Component } from '@angular/core';
import { OfflineService } from './offline.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  readonly titleWordingOnline: string = 'Tour of Heroes'
  readonly titleWordingOnffline: string = 'Tour of Heroes - Offline'
  title: string;

  constructor(private readonly offlineService: OfflineService)
    {
      this.registerToEvents(offlineService);
      this.title = this.titleWordingOnline;
    }

    private registerToEvents(offlineService: OfflineService) {
      offlineService.connectionChanged.subscribe(online => {
        if (online)
          this.title = this.titleWordingOnline;
        else
          this.title = this.titleWordingOnffline;
    });
  }

}


