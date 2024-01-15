import { Component, OnInit } from '@angular/core';
import dashjsClientPackageInfo from '../../../../package.json';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  clientVersion = dashjsClientPackageInfo.version;

  constructor() { }

  ngOnInit(): void {
  }

}
