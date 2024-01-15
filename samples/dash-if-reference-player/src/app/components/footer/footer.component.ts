import { Component, OnInit } from '@angular/core';
import contributorsJson from '../../../assets/contributors.json';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {

  contributors = contributorsJson.items;

  constructor() { }

  ngOnInit(): void {
  }

}
