import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetricsConfigurationComponent } from './metrics-configuration.component';

describe('MetricsConfigurationComponent', () => {
  let component: MetricsConfigurationComponent;
  let fixture: ComponentFixture<MetricsConfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MetricsConfigurationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MetricsConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
