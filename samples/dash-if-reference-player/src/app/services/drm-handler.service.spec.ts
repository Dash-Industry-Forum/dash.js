import { TestBed } from '@angular/core/testing';

import { DrmHandlerService } from './drm-handler.service';

describe('DrmHandlerService', () => {
  let service: DrmHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DrmHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
