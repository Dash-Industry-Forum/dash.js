import { TestBed } from '@angular/core/testing';

import { QueryHandlerService } from './query-handler.service';

describe('QueryHandlerService', () => {
  let service: QueryHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QueryHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
